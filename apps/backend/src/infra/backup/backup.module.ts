import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { DbModule } from '@infra/db/db.module';

@Module({
  imports: [ConfigModule, DbModule],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService]
})
export class BackupModule {}
