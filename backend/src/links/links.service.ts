import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LinksService {
  constructor(private prismaService: PrismaService) {}

  async createLink(questionnaireId: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return this.prismaService.questionnaireLink.create({
      data: {
        token,
        expiresAt,
        questionnaireId,
      },
    });
  }

  async findByToken(token: string) {
    const link = await this.prismaService.questionnaireLink.findUnique({
      where: { token },
      include: { questionnaire: true },
    });

    if (!link) {
      throw new NotFoundException('Ссылка не найдена!');
    }

    if (!link.isActive) {
      throw new ForbiddenException('Ссылка неактивна!');
    }

    if (link.expiresAt < new Date()) {
      throw new ForbiddenException('Срок действия ссылки уже истек!');
    }

    return link;
  }

  async deactivate(token: string) {
    return this.prismaService.questionnaireLink.update({
      where: { token },
      data: { isActive: false },
    });
  }

  async reactivateByQuestionnaireId(questionnaireId: string) {
    return this.prismaService.questionnaireLink.updateMany({
      where: { questionnaireId },
      data: { isActive: true },
    });
  }
}
