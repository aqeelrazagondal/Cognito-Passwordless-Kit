import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { randomBytes } from 'crypto';
import * as path from 'path';

export interface SecretsConstructProps {
  environment: string;
  kmsKey: kms.Key;
}

export interface SecretInfo {
  secret: secretsmanager.Secret;
  arn: string;
  name: string;
}

export class SecretsConstruct extends Construct {
  public readonly jwtSecret: SecretInfo;
  public readonly twilioSecret?: SecretInfo;
  public readonly captchaSecret?: SecretInfo;
  public readonly vonageSecret?: SecretInfo;
  public readonly allSecrets: SecretInfo[];

  constructor(scope: Construct, id: string, props: SecretsConstructProps) {
    super(scope, id);

    const { environment, kmsKey } = props;

    // JWT Secret (required) - with auto-rotation
    this.jwtSecret = this.createJWTSecret(environment, kmsKey);

    // Optional secrets (created if needed)
    // These can be created manually or via CDK context
    const createTwilioSecret = this.node.tryGetContext('createTwilioSecret') === true;
    const createCaptchaSecret = this.node.tryGetContext('createCaptchaSecret') === true;
    const createVonageSecret = this.node.tryGetContext('createVonageSecret') === true;

    if (createTwilioSecret) {
      this.twilioSecret = this.createTwilioSecret(environment, kmsKey);
    }

    if (createCaptchaSecret) {
      this.captchaSecret = this.createCaptchaSecret(environment, kmsKey);
    }

    if (createVonageSecret) {
      this.vonageSecret = this.createVonageSecret(environment, kmsKey);
    }

    // Collect all secrets
    this.allSecrets = [
      this.jwtSecret,
      ...(this.twilioSecret ? [this.twilioSecret] : []),
      ...(this.captchaSecret ? [this.captchaSecret] : []),
      ...(this.vonageSecret ? [this.vonageSecret] : []),
    ];

    // Output secret ARNs
    new cdk.CfnOutput(this, 'JWTSecretArn', {
      value: this.jwtSecret.arn,
      description: 'JWT Secret ARN in Secrets Manager',
      exportName: `AuthKit-${environment}-JWTSecretArn`,
    });
  }

  /**
   * Create JWT secret with auto-rotation
   */
  private createJWTSecret(environment: string, kmsKey: kms.Key): SecretInfo {
    const secretName = `authkit-jwt-secret-${environment}`;

    // Generate initial secret value (32 bytes, base64 encoded)
    const initialSecret = randomBytes(32).toString('base64');

    const secret = new secretsmanager.Secret(this, 'JWTSecret', {
      secretName,
      description: `JWT signing key for AuthKit (${environment})`,
      encryptionKey: kmsKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ secret: initialSecret }),
        generateStringKey: 'secret',
        excludeCharacters: '"@/\\',
        passwordLength: 32,
      },
      removalPolicy:
        environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Enable automatic rotation (every 30 days)
    secret.addRotationSchedule('JWTSecretRotation', {
      rotationLambda: this.createRotationLambda(secret, kmsKey),
      automaticallyAfter: cdk.Duration.days(30),
    });

    return {
      secret,
      arn: secret.secretArn,
      name: secretName,
    };
  }

  /**
   * Create Twilio secret
   */
  private createTwilioSecret(environment: string, kmsKey: kms.Key): SecretInfo {
    const secretName = `authkit-twilio-${environment}`;

    const secret = new secretsmanager.Secret(this, 'TwilioSecret', {
      secretName,
      description: `Twilio API credentials for AuthKit (${environment})`,
      encryptionKey: kmsKey,
      secretObjectValue: {
        accountSid: cdk.SecretValue.unsafePlainText('REPLACE_WITH_TWILIO_ACCOUNT_SID'),
        authToken: cdk.SecretValue.unsafePlainText('REPLACE_WITH_TWILIO_AUTH_TOKEN'),
        fromNumber: cdk.SecretValue.unsafePlainText('REPLACE_WITH_TWILIO_FROM_NUMBER'),
        whatsappNumber: cdk.SecretValue.unsafePlainText('REPLACE_WITH_TWILIO_WHATSAPP_NUMBER'),
      },
      removalPolicy:
        environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    return {
      secret,
      arn: secret.secretArn,
      name: secretName,
    };
  }

  /**
   * Create CAPTCHA secret
   */
  private createCaptchaSecret(environment: string, kmsKey: kms.Key): SecretInfo {
    const secretName = `authkit-captcha-${environment}`;

    const secret = new secretsmanager.Secret(this, 'CaptchaSecret', {
      secretName,
      description: `CAPTCHA credentials for AuthKit (${environment})`,
      encryptionKey: kmsKey,
      secretObjectValue: {
        provider: cdk.SecretValue.unsafePlainText('hcaptcha'), // or 'recaptcha'
        secretKey: cdk.SecretValue.unsafePlainText('REPLACE_WITH_CAPTCHA_SECRET_KEY'),
        siteKey: cdk.SecretValue.unsafePlainText('REPLACE_WITH_CAPTCHA_SITE_KEY'),
      },
      removalPolicy:
        environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    return {
      secret,
      arn: secret.secretArn,
      name: secretName,
    };
  }

  /**
   * Create Vonage secret
   */
  private createVonageSecret(environment: string, kmsKey: kms.Key): SecretInfo {
    const secretName = `authkit-vonage-${environment}`;

    const secret = new secretsmanager.Secret(this, 'VonageSecret', {
      secretName,
      description: `Vonage API credentials for AuthKit (${environment})`,
      encryptionKey: kmsKey,
      secretObjectValue: {
        apiKey: cdk.SecretValue.unsafePlainText('REPLACE_WITH_VONAGE_API_KEY'),
        apiSecret: cdk.SecretValue.unsafePlainText('REPLACE_WITH_VONAGE_API_SECRET'),
        fromNumber: cdk.SecretValue.unsafePlainText('REPLACE_WITH_VONAGE_FROM_NUMBER'),
      },
      removalPolicy:
        environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    return {
      secret,
      arn: secret.secretArn,
      name: secretName,
    };
  }

  /**
   * Create rotation Lambda for JWT secret
   */
  private createRotationLambda(
    secret: secretsmanager.Secret,
    kmsKey: kms.Key,
  ): lambda.Function {
    const rotationFn = new lambdaNodejs.NodejsFunction(this, 'JWTSecretRotation', {
      entry: path.join(__dirname, '../../../lambda/webhooks/rotate-jwt-key.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        SECRET_ARN: secret.secretArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // Grant permissions
    secret.grantRead(rotationFn);
    secret.grantWrite(rotationFn);
    kmsKey.grantDecrypt(rotationFn);

    // Additional permissions for rotation
    rotationFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'secretsmanager:DescribeSecret',
          'secretsmanager:GetSecretValue',
          'secretsmanager:PutSecretValue',
          'secretsmanager:UpdateSecretVersionStage',
        ],
        resources: [secret.secretArn],
      }),
    );

    return rotationFn;
  }

  /**
   * Grant read access to secrets for Lambda functions
   */
  public grantReadAccess(functions: lambda.Function[]): void {
    for (const secretInfo of this.allSecrets) {
      secretInfo.secret.grantRead(...functions);
    }
  }

  /**
   * Grant read access to secrets for a specific Lambda function
   */
  public grantReadAccessToFunction(fn: lambda.Function): void {
    for (const secretInfo of this.allSecrets) {
      secretInfo.secret.grantRead(fn);
    }
  }
}

