export const CHALLENGE_REPOSITORY = Symbol('CHALLENGE_REPOSITORY');
export const DEVICE_REPOSITORY = Symbol('DEVICE_REPOSITORY');
export const COUNTER_REPOSITORY = Symbol('COUNTER_REPOSITORY');
export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');
export const DENYLIST_REPOSITORY = Symbol('DENYLIST_REPOSITORY');
export const BOUNCE_REPOSITORY = Symbol('BOUNCE_REPOSITORY');

export type PersistenceBackend = 'memory' | 'dynamodb';
