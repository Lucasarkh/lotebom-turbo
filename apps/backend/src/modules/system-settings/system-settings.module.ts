import { Module } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { PublicSettingsController, AdminSettingsController } from './system-settings.controller';

@Module({
  providers: [SystemSettingsService],
  controllers: [PublicSettingsController, AdminSettingsController],
  exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
