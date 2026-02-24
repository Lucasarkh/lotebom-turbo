import { Module } from '@nestjs/common';
import { MapElementsService } from './map-elements.service';
import { MapElementsController } from './map-elements.controller';

@Module({
  controllers: [MapElementsController],
  providers: [MapElementsService],
  exports: [MapElementsService]
})
export class MapElementsModule {}
