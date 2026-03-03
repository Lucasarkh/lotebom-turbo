import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SeedRunnerService } from './seed-runner.service';

@Global()
@Module({
  providers: [PrismaService, SeedRunnerService],
  exports: [PrismaService]
})
export class DbModule {}
