import { Module } from '@nestjs/common';
import { PlantMapService } from './plant-map.service';
import {
  PlantHotspotController,
  PlantMapController,
  PlantMapItemController,
} from './plant-map.controller';
import { PublicPlantMapController } from './public-plant-map.controller';
import { S3Module } from '@infra/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [
    PlantMapController,
    PlantMapItemController,
    PlantHotspotController,
    PublicPlantMapController,
  ],
  providers: [PlantMapService],
  exports: [PlantMapService],
})
export class PlantMapModule {}
