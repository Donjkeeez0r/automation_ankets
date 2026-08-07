import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LinksService {
  constructor(
    private prismaService: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createLink(questionnaireId: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const link = await this.prismaService.questionnaireLink.create({
      data: { token, expiresAt, questionnaireId },
      include: {
        questionnaire: {
          include: { company: true },
        },
      },
    });

    const fillUrl = `${process.env.FRONTEND_URL}/fill/${token}`;

    for (const email of link.questionnaire.company.contactEmails) {
      await this.notificationsService.sendMail(
        email,
        'Анкета информационной безопасности',
        `
          <p>Здравствуйте, ${link.questionnaire.company.contactName}!</p>
          <p>Для продолжения сотрудничества просим заполнить анкету информационной безопасности по ссылке ниже.</p>
          <p><a href="${fillUrl}">${fillUrl}</a></p>
          <p>Ссылка действительна 30 дней.</p>
        `,
      );
    }

    return link;
  }

  async findByToken(token: string) {
    const link = await this.prismaService.questionnaireLink.findUnique({
      where: { token },
      include: {
        questionnaire: {
          include: {
            company: {
              select: {
                name: true,
                inn: true,
                contactName: true,
                contactEmails: true,
              },
            },
            answers: true,
            // Индивидуальная обязательность вопросов для этой анкеты —
            // подрядчик должен видеть актуальные правила при заполнении
            overrides: {
              select: { questionId: true, required: true },
            },
          },
        },
      },
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
