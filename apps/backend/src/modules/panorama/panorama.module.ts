import { Module } from '@nestjs/common';
import { PanoramaService } from './panorama.service';
import {
  PanoramaController,
  PanoramaItemController,
  PanoramaSnapshotController,
  PanoramaBeaconController
} from './panorama.controller';
import { PublicPanoramaController } from './public-panorama.controller';
import { S3Module } from '@infra/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [
    PanoramaController,
    PanoramaItemController,
    PanoramaSnapshotController,
    PanoramaBeaconController,
    PublicPanoramaController
  ],
  providers: [PanoramaService],
  exports: [PanoramaService]
})
export class PanoramaModule {}
