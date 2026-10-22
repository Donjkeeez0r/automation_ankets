import { forwardRef, Module } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireController } from './questionnaire.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoringModule } from '../scoring/scoring.module';
import { LinksModule } from '../links/links.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccessModule } from '../access/access.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { MaturityController } from '../maturity/maturity.controller';
import { MaturityService } from '../maturity/maturity.service';

@Module({
  providers: [QuestionnaireService, MaturityService],
  imports: [
    PrismaModule,
    ActivityLogModule,
    ScoringModule,
    forwardRef(() => LinksModule),
    AccessModule,
    NotificationsModule,
  ],
  controllers: [QuestionnaireController, MaturityController],
  exports: [QuestionnaireService, MaturityService],
})
export class QuestionnaireModule {}
