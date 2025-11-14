export declare const TABLES: {
    readonly CHALLENGES: string;
    readonly DEVICES: string;
    readonly COUNTERS: string;
    readonly AUDIT_LOGS: string;
    readonly DENYLIST: string;
    readonly BOUNCES: string;
};
export declare const INDEXES: {
    readonly CHALLENGES_BY_IDENTIFIER_CREATED_AT: "identifierHash-createdAt-index";
    readonly CHALLENGES_BY_STATUS_CREATED_AT: "status-createdAt-index";
    readonly DEVICES_BY_FINGERPRINT: "fingerprintHash-index";
    readonly DEVICES_BY_USER_TRUSTED: "userId-trusted-index";
    readonly AUDIT_BY_EVENTTYPE_TIMESTAMP: "eventType-timestamp-index";
    readonly AUDIT_BY_IDENTIFIER_TIMESTAMP: "identifierHash-timestamp-index";
};
