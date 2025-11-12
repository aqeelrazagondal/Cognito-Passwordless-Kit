import { Module } from '@nestjs/common';
import { DeviceController } from './controllers/device.controller';
import { DeviceService } from './services/device.service';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [PersistenceModule],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
