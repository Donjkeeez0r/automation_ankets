import { forwardRef, Module } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireController } from './questionnaire.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoringModule } from '../scoring/scoring.module';
import { LinksModule } from '../links/links.module';

@Module({
  providers: [QuestionnaireService],
  imports: [PrismaModule, ScoringModule, forwardRef(() => LinksModule)],
  controllers: [QuestionnaireController],
  exports: [QuestionnaireService],
})
export class QuestionnaireModule {}
