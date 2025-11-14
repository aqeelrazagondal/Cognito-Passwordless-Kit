export const TABLES = {
  CHALLENGES: process.env.CHALLENGES_TABLE || process.env.AUTHKIT_CHALLENGES_TABLE || 'authkit-challenges-local',
  DEVICES: process.env.DEVICES_TABLE || process.env.AUTHKIT_DEVICES_TABLE || 'authkit-devices-local',
  COUNTERS: process.env.COUNTERS_TABLE || process.env.AUTHKIT_COUNTERS_TABLE || 'authkit-counters-local',
  AUDIT_LOGS: process.env.AUDIT_LOGS_TABLE || process.env.AUTHKIT_AUDIT_LOGS_TABLE || 'authkit-audit-logs-local',
  DENYLIST: process.env.DENYLIST_TABLE || process.env.AUTHKIT_DENYLIST_TABLE || 'authkit-denylist-local',
  BOUNCES: process.env.BOUNCES_TABLE || process.env.AUTHKIT_BOUNCES_TABLE || 'authkit-bounces-local',
} as const;

export const INDEXES = {
  // Challenges
  CHALLENGES_BY_IDENTIFIER_CREATED_AT: 'identifierHash-createdAt-index',
  CHALLENGES_BY_STATUS_CREATED_AT: 'status-createdAt-index',
  // Devices
  DEVICES_BY_FINGERPRINT: 'fingerprintHash-index',
  DEVICES_BY_USER_TRUSTED: 'userId-trusted-index',
  // Audit
  AUDIT_BY_EVENTTYPE_TIMESTAMP: 'eventType-timestamp-index',
  AUDIT_BY_IDENTIFIER_TIMESTAMP: 'identifierHash-timestamp-index',
} as const;
