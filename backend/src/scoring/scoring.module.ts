import { Module } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [ScoringService],
  imports: [PrismaModule],
  exports: [ScoringService],
})
export class ScoringModule {}
