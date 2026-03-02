import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PublicProjectsController } from './public-projects.controller';
import { NearbyModule } from '@modules/nearby/nearby.module';

@Module({
  imports: [NearbyModule],
  controllers: [ProjectsController, PublicProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService]
})
export class ProjectsModule {}
