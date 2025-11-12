/**
 * Verify Auth Challenge Response Lambda Trigger
 *
 * This trigger validates the user's OTP response against the stored challenge in DynamoDB.
 */

import { VerifyAuthChallengeResponseTriggerHandler } from 'aws-lambda';
import { validateChallenge, consumeChallenge } from './shared/challenge-validator';
import { log } from './shared/utils';

export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  log('INFO', 'VerifyAuthChallengeResponse triggered', {
    userName: event.userName,
  });

  try {
    // Extract challenge ID and code from request
    const challengeId = event.request.privateChallengeParameters?.challengeId;
    const expectedCode = event.request.privateChallengeParameters?.code;
    const userAnswer = event.request.challengeAnswer;

    if (!challengeId) {
      log('ERROR', 'Missing challengeId in private challenge parameters');
      event.response.answerCorrect = false;
      return event;
    }

    if (!userAnswer) {
      log('WARN', 'User provided no answer');
      event.response.answerCorrect = false;
      return event;
    }

    log('INFO', 'Validating challenge', {
      challengeId,
      userAnswerLength: userAnswer.length,
    });

    // Validate against DynamoDB
    const validation = await validateChallenge(challengeId, userAnswer);

    if (!validation.valid) {
      log('WARN', 'Challenge validation failed', {
        challengeId,
        reason: validation.reason,
      });
      event.response.answerCorrect = false;
      return event;
    }

    // Fallback: Also check against private challenge parameters (in-memory)
    // This is useful if DynamoDB is unavailable
    if (expectedCode && userAnswer !== expectedCode) {
      log('WARN', 'Answer does not match expected code', { challengeId });
      event.response.answerCorrect = false;
      return event;
    }

    // Mark challenge as consumed
    await consumeChallenge(challengeId);

    log('INFO', 'Challenge verified successfully', { challengeId });
    event.response.answerCorrect = true;

    return event;
  } catch (error) {
    log('ERROR', 'Failed to verify challenge', { error });
    event.response.answerCorrect = false;
    return event;
  }
};
