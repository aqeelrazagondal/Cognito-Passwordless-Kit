import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AUDIT_LOG_REPOSITORY,
  CHALLENGE_REPOSITORY,
  COUNTER_REPOSITORY,
  DEVICE_REPOSITORY,
} from './tokens';

// DynamoDB implementations
import { DynamoDBChallengeRepository } from '../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBChallengeRepository';
import { DynamoDBDeviceRepository } from '../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBDeviceRepository';
import { DynamoDBCounterRepository } from '../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBCounterRepository';
import { DynamoDBAuditLogRepository } from '../../packages/auth-kit-core/src/infrastructure/repositories/DynamoDBAuditLogRepository';

// In-memory fallbacks
import { MemoryChallengeRepository } from '../../packages/auth-kit-core/src/infrastructure/repositories/memory/MemoryChallengeRepository';
import { MemoryDeviceRepository } from '../../packages/auth-kit-core/src/infrastructure/repositories/memory/MemoryDeviceRepository';
import { MemoryCounterRepository } from '../../packages/auth-kit-core/src/infrastructure/repositories/memory/MemoryCounterRepository';

function backendIsDynamo(config: ConfigService): boolean {
  const backend = (config.get<string>('PERSISTENCE_BACKEND') || 'memory').toLowerCase();
  return backend === 'dynamodb';
}

const repoProviders: Provider[] = [
  {
    provide: CHALLENGE_REPOSITORY,
    inject: [ConfigService],
    useFactory: (config: ConfigService) =>
      backendIsDynamo(config) ? new DynamoDBChallengeRepository() : new MemoryChallengeRepository(),
  },
  {
    provide: DEVICE_REPOSITORY,
    inject: [ConfigService],
    useFactory: (config: ConfigService) =>
      backendIsDynamo(config) ? new DynamoDBDeviceRepository() : new MemoryDeviceRepository(),
  },
  {
    provide: COUNTER_REPOSITORY,
    inject: [ConfigService],
    useFactory: (config: ConfigService) =>
      backendIsDynamo(config) ? new DynamoDBCounterRepository() : new MemoryCounterRepository(),
  },
  {
    provide: AUDIT_LOG_REPOSITORY,
    inject: [ConfigService],
    useFactory: (config: ConfigService) =>
      backendIsDynamo(config) ? new DynamoDBAuditLogRepository() : new DynamoDBAuditLogRepository(),
    // For now, use DynamoDB for audit if available; otherwise this could be a no-op logger implementation
  },
];

@Module({
  providers: [...repoProviders],
  exports: [...repoProviders],
})
export class PersistenceModule {}
