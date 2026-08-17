import { forwardRef, Module } from '@nestjs/common';
import { LinksService } from './links.service';
import { LinksController } from './links.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QuestionnaireModule } from '../questionnaire/questionnaire.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ArtifactsModule } from '../artifacts/artifacts.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => QuestionnaireModule),
    ArtifactsModule,
    NotificationsModule,
  ],
  providers: [LinksService],
  controllers: [LinksController],
  exports: [LinksService],
})
export class LinksModule {}
