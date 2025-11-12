import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { INestApplicationContext, Module } from '@nestjs/common';
import { PersistenceModule } from '../src/persistence/persistence.module';
import {
  CHALLENGE_REPOSITORY,
  COUNTER_REPOSITORY,
  DEVICE_REPOSITORY,
} from '../src/persistence/tokens';
import { IChallengeRepository } from '../packages/auth-kit-core/src/infrastructure/interfaces/IChallengeRepository';
import { IDeviceRepository } from '../packages/auth-kit-core/src/infrastructure/interfaces/IDeviceRepository';
import { ICounterRepository } from '../packages/auth-kit-core/src/infrastructure/interfaces/ICounterRepository';
import { Identifier } from '../packages/auth-kit-core/src/domain/value-objects/Identifier';
import { OTPChallenge } from '../packages/auth-kit-core/src/domain/entities/OTPChallenge';
import { Device } from '../packages/auth-kit-core/src/domain/entities/Device';
import { DeviceFingerprint } from '../packages/auth-kit-core/src/domain/value-objects/DeviceFingerprint';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    PersistenceModule,
  ],
})
class SmokeModule {}

async function run() {
  let app: INestApplicationContext | null = null;
  try {
    app = await (await import('@nestjs/core')).NestFactory.createApplicationContext(
      SmokeModule,
      { logger: ['log', 'error', 'warn'] },
    );

    const challenges = app.get<IChallengeRepository>(CHALLENGE_REPOSITORY as any);
    const counters = app.get<ICounterRepository>(COUNTER_REPOSITORY as any);
    const devices = app.get<IDeviceRepository>(DEVICE_REPOSITORY as any);

    console.log('Backend:', process.env.PERSISTENCE_BACKEND || 'memory');

    // Challenge CRUD flow
    const identifier = Identifier.create('user@example.com');
    const code = OTPChallenge.generateCode(6);
    const ch = OTPChallenge.create({ identifier, channel: 'email', intent: 'login', code });
    await challenges.create(ch);
    const fetchedActive = await challenges.getActiveByIdentifier(identifier);
    if (!fetchedActive || fetchedActive.id !== ch.id) {
      throw new Error('Challenge getActiveByIdentifier failed');
    }
    const verified = await challenges.verifyAndConsume(ch.id, code);
    if (!verified) {
      throw new Error('Challenge verifyAndConsume failed');
    }
    await challenges.deleteById(ch.id);

    // Counter flow
    const ckey = 'identifier:user@example.com';
    const inc1 = await counters.increment(ckey, 10);
    const inc2 = await counters.increment(ckey, 10);
    if (inc2.count !== inc1.count + 1) {
      throw new Error(`Counter increment failed: inc1.count=${inc1.count}, inc2.count=${inc2.count}`);
    }
    await counters.reset(ckey);

    // Device flow (bind + list + revoke)
    const fp = DeviceFingerprint.create({ userAgent: 'smoke', platform: 'node', timezone: 'UTC' });
    const device = Device.create({ userId: 'user-123', fingerprint: fp, trusted: true });
    await devices.upsert(device);
    const list = await devices.listByUser('user-123');
    if (!list.find((d) => d.id === device.id)) {
      throw new Error('Device upsert/list failed');
    }
    await devices.revokeDevice('user-123', device.id);
    const revokedDevice = await devices.getByUserAndDeviceId('user-123', device.id);
    if (!revokedDevice || revokedDevice.trusted) {
      throw new Error('Device revoke failed');
    }

    console.log('Smoke OK');
    process.exit(0);
  } catch (err) {
    console.error('Smoke FAILED:', err);
    process.exit(1);
  } finally {
    if (app) await app.close();
  }
}

run();
