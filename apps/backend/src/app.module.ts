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
import { DbModule } from '@infra/db/db.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DbModule,
    AuthModule,
    UserModule,
    ProjectsModule,
    MapElementsModule,
    LotsModule,
    LeadsModule,
    UploadModule,
    RealtorLinksModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
