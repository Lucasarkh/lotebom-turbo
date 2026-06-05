import { Module } from '@nestjs/common';
import { AgentApiKeysController } from './agent-api-keys.controller';
import { AgentApiKeysService } from './agent-api-keys.service';
import { DbModule } from '@infra/db/db.module';

@Module({
  imports: [DbModule],
  controllers: [AgentApiKeysController],
  providers: [AgentApiKeysService],
  exports: [AgentApiKeysService]
})
export class AgentApiKeysModule {}
