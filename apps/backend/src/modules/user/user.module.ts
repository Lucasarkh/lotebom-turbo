import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { EmailQueueModule } from '@infra/email-queue/email-queue.module';

@Module({
  imports: [EmailQueueModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
