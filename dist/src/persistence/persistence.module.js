"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistenceModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const tokens_1 = require("./tokens");
const DynamoDBChallengeRepository_1 = require("../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBChallengeRepository");
const DynamoDBDeviceRepository_1 = require("../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBDeviceRepository");
const DynamoDBCounterRepository_1 = require("../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBCounterRepository");
const DynamoDBAuditLogRepository_1 = require("../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBAuditLogRepository");
const DynamoDBDenylistRepository_1 = require("../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBDenylistRepository");
const DynamoDBBounceRepository_1 = require("../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBBounceRepository");
const MemoryChallengeRepository_1 = require("../../packages/auth-kit-core/src/infrastructure/repositories/memory/MemoryChallengeRepository");
const MemoryDeviceRepository_1 = require("../../packages/auth-kit-core/src/infrastructure/repositories/memory/MemoryDeviceRepository");
const MemoryCounterRepository_1 = require("../../packages/auth-kit-core/src/infrastructure/repositories/memory/MemoryCounterRepository");
function backendIsDynamo(config) {
    const backend = (config.get('PERSISTENCE_BACKEND') || 'memory').toLowerCase();
    return backend === 'dynamodb';
}
const repoProviders = [
    {
        provide: tokens_1.CHALLENGE_REPOSITORY,
        inject: [config_1.ConfigService],
        useFactory: (config) => backendIsDynamo(config) ? new DynamoDBChallengeRepository_1.DynamoDBChallengeRepository() : new MemoryChallengeRepository_1.MemoryChallengeRepository(),
    },
    {
        provide: tokens_1.DEVICE_REPOSITORY,
        inject: [config_1.ConfigService],
        useFactory: (config) => backendIsDynamo(config) ? new DynamoDBDeviceRepository_1.DynamoDBDeviceRepository() : new MemoryDeviceRepository_1.MemoryDeviceRepository(),
    },
    {
        provide: tokens_1.COUNTER_REPOSITORY,
        inject: [config_1.ConfigService],
        useFactory: (config) => backendIsDynamo(config) ? new DynamoDBCounterRepository_1.DynamoDBCounterRepository() : new MemoryCounterRepository_1.MemoryCounterRepository(),
    },
    {
        provide: tokens_1.AUDIT_LOG_REPOSITORY,
        inject: [config_1.ConfigService],
        useFactory: (config) => backendIsDynamo(config) ? new DynamoDBAuditLogRepository_1.DynamoDBAuditLogRepository() : new DynamoDBAuditLogRepository_1.DynamoDBAuditLogRepository(),
    },
    {
        provide: tokens_1.DENYLIST_REPOSITORY,
        inject: [config_1.ConfigService],
        useFactory: (config) => backendIsDynamo(config) ? new DynamoDBDenylistRepository_1.DynamoDBDenylistRepository() : new DynamoDBDenylistRepository_1.DynamoDBDenylistRepository(),
    },
    {
        provide: tokens_1.BOUNCE_REPOSITORY,
        inject: [config_1.ConfigService],
        useFactory: (config) => backendIsDynamo(config) ? new DynamoDBBounceRepository_1.DynamoDBBounceRepository() : new DynamoDBBounceRepository_1.DynamoDBBounceRepository(),
    },
];
let PersistenceModule = class PersistenceModule {
};
exports.PersistenceModule = PersistenceModule;
exports.PersistenceModule = PersistenceModule = __decorate([
    (0, common_1.Module)({
        providers: [...repoProviders],
        exports: [...repoProviders],
    })
], PersistenceModule);
//# sourceMappingURL=persistence.module.js.map