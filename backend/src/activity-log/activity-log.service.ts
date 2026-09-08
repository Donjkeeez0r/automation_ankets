import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogService {
  constructor(private prismaService: PrismaService) {}

  async log(questionnaireId: string, type: string, description: string) {
    return this.prismaService.activityLog.create({
      data: { questionnaireId, type, description },
    });
  }

  async getByQuestionnaire(questionnaireId: string) {
    return this.prismaService.activityLog.findMany({
      where: { questionnaireId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
