import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SendPulseService } from './sendpulse.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SendPulseService],
  exports: [SendPulseService]
})
export class SendPulseModule {}
