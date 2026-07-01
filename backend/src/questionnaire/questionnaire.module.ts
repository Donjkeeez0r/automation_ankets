import { Module } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireController } from './questionnaire.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  providers: [QuestionnaireService],
  imports: [PrismaModule, ScoringModule],
  controllers: [QuestionnaireController],
})
export class QuestionnaireModule {}
