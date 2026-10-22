import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QuestionnaireAccessService } from './questionnaire-access.service';

@Module({
  imports: [PrismaModule],
  providers: [QuestionnaireAccessService],
  exports: [QuestionnaireAccessService],
})
export class AccessModule {}
