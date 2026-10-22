import { forwardRef, Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QuestionnaireModule } from '../questionnaire/questionnaire.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';
import { CompaniesModule } from '../companies/companies.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { AccessModule } from '../access/access.module';

@Module({
  imports: [
    PrismaModule,
    ActivityLogModule,
    forwardRef(() => QuestionnaireModule),
    ArtifactsModule,
    NotificationsModule,
    CompaniesModule,
    AccessModule,
  ],
  providers: [LinksService],
  controllers: [LinksController],
  exports: [LinksService],
})
export class LinksModule {}
