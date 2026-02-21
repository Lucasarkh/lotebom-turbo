import { Module } from '@nestjs/common';
import { RealtorLinksService } from './realtor-links.service';
import { RealtorLinksController } from './realtor-links.controller';
import { PublicRealtorLinksController } from './public-realtor-links.controller';

@Module({
  controllers: [RealtorLinksController, PublicRealtorLinksController],
  providers: [RealtorLinksService],
  exports: [RealtorLinksService],
})
export class RealtorLinksModule {}
