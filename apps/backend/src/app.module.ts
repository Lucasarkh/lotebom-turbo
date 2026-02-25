import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
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
import { PaymentModule } from '@modules/payment/payment.module';
import { DbModule } from '@infra/db/db.module';
import { SystemSettingsModule } from '@modules/system-settings/system-settings.module';
import { RabbitMqModule } from '@infra/rabbitmq/rabbitmq.module';
import { SendPulseModule } from '@infra/sendpulse/sendpulse.module';
import { EmailQueueModule } from '@infra/email-queue/email-queue.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    DbModule,
    RabbitMqModule,
    SendPulseModule,
    EmailQueueModule,
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
    PaymentModule,
    SystemSettingsModule
  ],
  controllers: [],
  providers: []
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
