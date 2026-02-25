import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PublicAiController } from './public-ai.controller';
import { DbModule } from '../../infra/db/db.module';

@Module({
  imports: [DbModule],
  controllers: [AiController, PublicAiController],
  providers: [AiService],
  exports: [AiService]
})
export class AiModule {}
