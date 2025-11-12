/**
 * Shared utilities for Cognito Lambda triggers
 */

export interface ChallengeMetadata {
  identifier: string;
  channel: 'email' | 'sms' | 'whatsapp';
  intent: 'login' | 'signup' | 'verify';
  challengeId?: string;
  code?: string;
}

/**
 * Parse challenge metadata from session
 */
export function parseChallengeMetadata(session: any[]): ChallengeMetadata | null {
  if (!session || session.length === 0) return null;

  const lastChallenge = session[session.length - 1];
  if (!lastChallenge?.challengeMetadata) return null;

  try {
    return JSON.parse(lastChallenge.challengeMetadata);
  } catch {
    return null;
  }
}

/**
 * Encode challenge metadata for session
 */
export function encodeChallengeMetadata(metadata: ChallengeMetadata): string {
  return JSON.stringify(metadata);
}

/**
 * Extract identifier (email or phone) from Cognito event
 */
export function extractIdentifier(event: any): string {
  return event.request.userAttributes?.email ||
         event.request.userAttributes?.phone_number ||
         event.userName;
}

/**
 * Determine channel from identifier
 */
export function determineChannel(identifier: string): 'email' | 'sms' {
  // Simple heuristic: if it starts with + or contains only digits, it's a phone
  if (identifier.startsWith('+') || /^\d+$/.test(identifier)) {
    return 'sms';
  }
  return 'email';
}

/**
 * Log with structured format
 */
export function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  }));
}
