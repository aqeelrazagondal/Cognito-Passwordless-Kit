/**
 * Start Authentication Lambda Handler
 *
 * Initiates passwordless authentication flow (OTP or Magic Link)
 */

import { APIGatewayProxyEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { withErrorHandler } from '../shared/middleware/error-handler';
import { success, badRequest, tooManyRequests } from '../shared/utils/response-builder';
import { parseBody, getClientIp, getUserAgent } from '../shared/utils/request-parser';
import { validateRequired, validateIdentifier, validateChannel, validateIntent } from '../shared/middleware/validator';
import { createLogger, logInvocationStart, logInvocationEnd } from '../shared/middleware/logger';
import {
  getChallengeRepository,
  getCounterRepository,
  checkDenylist,
  checkAbuse,
  verifyCaptcha,
  getRateLimiter,
} from '../shared/services';
import { Identifier } from '../../../../auth-kit-core/src/domain/value-objects/Identifier';
import { OTPChallenge } from '../../../../auth-kit-core/src/domain/entities/OTPChallenge';
import { createHash } from 'crypto';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

interface StartAuthRequest {
  identifier: string;
  channel: 'email' | 'sms' | 'whatsapp';
  intent: 'login' | 'signup' | 'verify' | 'bind';
  deviceFingerprint?: {
    userAgent: string;
    platform: string;
    timezone: string;
    language?: string;
    screenResolution?: string;
  };
  captchaToken?: string;
  geoCountry?: string;
  geoCity?: string;
}

async function startAuthHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  logInvocationStart(event, context);
  const logger = createLogger(context);

  try {
    // Parse and validate request
    const body = parseBody<StartAuthRequest>(event);
    validateRequired(body, ['identifier', 'channel', 'intent']);
    validateIdentifier(body.identifier);
    validateChannel(body.channel);
    validateIntent(body.intent);

    const ip = getClientIp(event);
    const userAgent = getUserAgent(event);

    logger.info('Starting authentication flow', {
      identifier: body.identifier,
      channel: body.channel,
      intent: body.intent,
      ip,
    });

    // Parse identifier
    const identifier = Identifier.create(body.identifier);

    // Check denylist
    const denylistCheck = await checkDenylist(body.identifier);
    if (denylistCheck.blocked) {
      logger.warn('Identifier blocked', { identifier: body.identifier, reason: denylistCheck.reason });
      return badRequest('Identifier is blocked', {
        reason: denylistCheck.reason,
      });
    }

    // Check abuse patterns
    const ipHash = createHash('sha256').update(ip).digest('hex');
    const abuseCheck = await checkAbuse({
      identifier: body.identifier,
      identifierHash: identifier.hash,
      ip,
      userAgent,
      geoCountry: body.geoCountry,
      geoCity: body.geoCity,
      timestamp: new Date(),
    });

    if (abuseCheck.action === 'block') {
      logger.warn('Request blocked due to abuse', { reasons: abuseCheck.reasons, riskScore: abuseCheck.riskScore });
      return badRequest('Request blocked due to suspicious activity', {
        reasons: abuseCheck.reasons,
        riskScore: abuseCheck.riskScore,
      });
    }

    // Verify CAPTCHA if required
    if (abuseCheck.action === 'challenge' || body.captchaToken) {
      if (!body.captchaToken) {
        return badRequest('CAPTCHA verification required', {
          requiresCaptcha: true,
        });
      }

      const captchaResult = await verifyCaptcha(body.captchaToken, ip);
      if (!captchaResult.success) {
        logger.warn('CAPTCHA verification failed', { error: captchaResult.error });
        return badRequest('CAPTCHA verification failed', {
          error: captchaResult.error,
        });
      }
    }

    // Check rate limits
    const rateLimiter = getRateLimiter();
    const rateLimitCheck = await rateLimiter.checkLimit({
      key: `auth:identifier:${identifier.hash}`,
      windowSeconds: 3600, // 1 hour
      maxRequests: 10,
    });

    if (!rateLimitCheck.allowed) {
      logger.warn('Rate limit exceeded', { identifier: body.identifier });
      return tooManyRequests('Rate limit exceeded', {
        resetAt: rateLimitCheck.resetAt,
      });
    }

    // Check IP rate limit
    const ipRateLimitCheck = await rateLimiter.checkLimit({
      key: `auth:ip:${ipHash}`,
      windowSeconds: 3600,
      maxRequests: 20,
    });

    if (!ipRateLimitCheck.allowed) {
      logger.warn('IP rate limit exceeded', { ip });
      return tooManyRequests('Rate limit exceeded', {
        resetAt: ipRateLimitCheck.resetAt,
      });
    }

    // Create OTP challenge
    const challengeRepo = getChallengeRepository();
    const code = OTPChallenge.generateCode(6);
    const challenge = OTPChallenge.create({
      identifier,
      channel: body.channel,
      intent: body.intent === 'signup' ? 'login' : (body.intent as 'login' | 'bind' | 'verifyContact'),
      code,
      ipHash,
      deviceId: body.deviceFingerprint ? createHash('sha256').update(JSON.stringify(body.deviceFingerprint)).digest('hex') : undefined,
    });

    await challengeRepo.create(challenge);

    // Send OTP/Magic Link based on channel
    if (body.channel === 'email') {
      await sendEmailOTP(body.identifier, code, challenge.id);
    } else {
      await sendSMSOTP(body.identifier, code, body.channel);
    }

    // Increment counters for abuse detection
    const counterRepo = getCounterRepository();
    await counterRepo.increment(`auth:identifier:${identifier.hash}`, 3600);
    await counterRepo.increment(`auth:ip:${ipHash}`, 3600);
    if (body.geoCountry) {
      await counterRepo.increment(`auth:geo:${body.geoCountry}`, 3600);
    }

    const response = {
      success: true,
      method: body.channel === 'email' ? 'magic-link' : 'otp',
      sentTo: maskIdentifier(body.identifier),
      expiresIn: body.channel === 'email' ? 900 : 300, // 15 min for magic link, 5 min for OTP
      challengeId: challenge.id,
      canResend: true,
    };

    const duration = Date.now() - startTime;
    logInvocationEnd(context, 200, duration);

    return success(response);
  } catch (err: any) {
    logger.error('Error in startAuthHandler', { error: err.message, stack: err.stack });
    throw err;
  }
}

/**
 * Send OTP via email (SES)
 */
async function sendEmailOTP(email: string, code: string, challengeId: string): Promise<void> {
  const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  const fromEmail = process.env.SES_IDENTITY || 'noreply@example.com';
  const subject = 'Your authentication code';
  const body = `
    <html>
      <body>
        <h2>Your authentication code</h2>
        <p>Your code is: <strong>${code}</strong></p>
        <p>This code will expire in 5 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </body>
    </html>
  `;

  await sesClient.send(
    new SendEmailCommand({
      Source: fromEmail,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: body } },
      },
      ConfigurationSetName: process.env.SES_CONFIGURATION_SET,
    })
  );
}

/**
 * Send OTP via SMS (SNS)
 */
async function sendSMSOTP(phone: string, code: string, channel: 'sms' | 'whatsapp'): Promise<void> {
  const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-east-1',
  });

  const message = `Your authentication code is: ${code}. This code expires in 5 minutes.`;
  const topicArn = process.env.SNS_TOPIC_ARN;

  if (topicArn) {
    await snsClient.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: message,
        MessageAttributes: {
          'phone': { DataType: 'String', StringValue: phone },
          'channel': { DataType: 'String', StringValue: channel },
        },
      })
    );
  } else {
    // Fallback: publish directly to phone number
    await snsClient.send(
      new PublishCommand({
        PhoneNumber: phone,
        Message: message,
      })
    );
  }
}

/**
 * Mask identifier for security
 */
function maskIdentifier(identifier: string): string {
  if (identifier.includes('@')) {
    // Email: show first 2 chars and domain
    const [local, domain] = identifier.split('@');
    return `${local.substring(0, 2)}***@${domain}`;
  } else {
    // Phone: show last 4 digits
    return `***${identifier.slice(-4)}`;
  }
}

export const handler = withErrorHandler(startAuthHandler);
