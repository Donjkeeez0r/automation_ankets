import { forwardRef, Module } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireController } from './questionnaire.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoringModule } from '../scoring/scoring.module';
import { LinksModule } from '../links/links.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  providers: [QuestionnaireService],
  imports: [
    PrismaModule,
    ActivityLogModule,
    ScoringModule,
    forwardRef(() => LinksModule),
    UsersModule,
    NotificationsModule,
  ],
  controllers: [QuestionnaireController],
  exports: [QuestionnaireService],
})
export class QuestionnaireModule {}
