import { Module, Global } from '@nestjs/common';
import { EmailQueueService } from './email-queue.service';
import { RabbitMqModule } from '@infra/rabbitmq/rabbitmq.module';
import { SendPulseModule } from '@infra/sendpulse/sendpulse.module';

@Global()
@Module({
  imports: [RabbitMqModule, SendPulseModule],
  providers: [EmailQueueService],
  exports: [EmailQueueService]
})
export class EmailQueueModule {}
