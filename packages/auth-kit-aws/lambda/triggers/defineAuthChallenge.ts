/**
 * Define Auth Challenge Lambda Trigger
 *
 * This trigger defines the authentication flow state machine for Cognito's CUSTOM_AUTH.
 * It determines what challenge to issue next based on the session state.
 */

import { DefineAuthChallengeTriggerHandler } from 'aws-lambda';
import { parseChallengeMetadata, log } from './shared/utils';

export const handler: DefineAuthChallengeTriggerHandler = async (event) => {
  log('INFO', 'DefineAuthChallenge triggered', {
    userName: event.userName,
    sessionLength: event.request.session.length,
  });

  const session = event.request.session;

  // No session yet - start with custom challenge
  if (session.length === 0) {
    log('INFO', 'Starting new auth flow - issuing CUSTOM_CHALLENGE');
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    return event;
  }

  // Check last challenge result
  const lastChallenge = session[session.length - 1];

  // If last challenge was answered correctly, issue tokens
  if (lastChallenge.challengeResult === true) {
    log('INFO', 'Challenge answered correctly - issuing tokens');
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }

  // If we've had too many failed attempts (max 3), fail authentication
  const failedAttempts = session.filter(s => s.challengeResult === false).length;
  if (failedAttempts >= 3) {
    log('WARN', 'Too many failed attempts - failing authentication', { failedAttempts });
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }

  // Last challenge was answered incorrectly but we have retries left
  log('INFO', 'Challenge answered incorrectly - issuing new challenge', {
    failedAttempts,
    retriesRemaining: 3 - failedAttempts,
  });
  event.response.challengeName = 'CUSTOM_CHALLENGE';
  event.response.issueTokens = false;
  event.response.failAuthentication = false;

  return event;
};
