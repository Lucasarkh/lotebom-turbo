import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { ProjectsModule } from '@modules/projects/projects.module';
import { MapElementsModule } from '@modules/map-elements/map-elements.module';
import { LotsModule } from '@modules/lots/lots.module';
import { LeadsModule } from '@modules/leads/leads.module';
import { UploadModule } from '@modules/upload/upload.module';
import { RealtorLinksModule } from '@modules/realtor-links/realtor-links.module';
import { PlantMapModule } from '@modules/plant-map/plant-map.module';
import { PanoramaModule } from '@modules/panorama/panorama.module';
import { TrackingModule } from '@modules/tracking/tracking.module';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { TenantsModule } from '@modules/tenants/tenants.module';
import { DbModule } from '@infra/db/db.module';
import { SystemSettingsModule } from '@modules/system-settings/system-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    DbModule,
    AuthModule,
    UserModule,
    TenantsModule,
    ProjectsModule,
    MapElementsModule,
    LotsModule,
    LeadsModule,
    UploadModule,
    RealtorLinksModule,
    PlantMapModule,
    PanoramaModule,
    TrackingModule,
    CampaignsModule,
    SystemSettingsModule
  ],
  controllers: [],
  providers: []
})
export class AppModule {}
