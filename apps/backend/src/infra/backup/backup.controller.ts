import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { BackupService } from './backup.service';

@ApiTags('Backups')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SYSADMIN')
@Controller('backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  listBackups() {
    return this.backupService.listBackups();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createBackup() {
    return this.backupService.createBackup('manual');
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  restoreBackup(@Body('key') key: string) {
    return this.backupService.restoreBackup(key);
  }

  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  cleanupBackups() {
    return this.backupService.cleanupOldBackups();
  }
}
