import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Status } from '../generated/prisma';
import { DEFAULT_FILL_DAYS } from './dto/create-link.dto';

// Статусы, в которых анкету ещё заполняют — во всех остальных ссылка
// неактивна именно потому, что анкету уже отправили.
const FILLABLE_STATUSES: Status[] = ['DRAFT', 'REVISION'];

// Код в теле 403-ответа: фронт по нему показывает экран подтверждения
// отправки вместо сообщения о недоступной ссылке.
export const ALREADY_SUBMITTED = 'ALREADY_SUBMITTED';

const LINK_LIFETIME_DAYS = 30;

function linkExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + LINK_LIFETIME_DAYS);
  return expiresAt;
}

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  constructor(
    private prismaService: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async createLink(
    questionnaireId: string,
    fillDays: number = DEFAULT_FILL_DAYS,
  ) {
    const token = randomBytes(32).toString('hex');

    const fillDeadlineAt = new Date();
    fillDeadlineAt.setDate(fillDeadlineAt.getDate() + fillDays);

    const link = await this.prismaService.questionnaireLink.create({
      data: { token, expiresAt: linkExpiryDate(), questionnaireId },
      include: {
        questionnaire: {
          include: { company: true },
        },
      },
    });

    await this.prismaService.questionnaire.update({
      where: { id: questionnaireId },
      data: { fillDeadlineAt },
    });

    const fillUrl = `${process.env.FRONTEND_URL}/fill/${token}`;

    for (const email of link.questionnaire.company.contactEmails) {
      try {
        await this.notificationsService.sendMail(
          email,
          'Анкета информационной безопасности',
          `
          <p>Здравствуйте, ${link.questionnaire.company.contactName}!</p>
          <p>Для продолжения сотрудничества просим вас пройти анкетирование по информационной безопасности.</p>
          <p><a href="${fillUrl}">${fillUrl}</a></p>
          <hr>
          <p><strong>Важно перед началом заполнения:</strong></p>
          <ul>
            <li>Все ответы должны быть развёрнутыми и содержательными — формальные отписки не принимаются и будут возвращены на доработку.</li>
            <li>По вопросам, отмеченным звёздочкой (*), ответ обязателен.</li>
            <li>При необходимости прикладывайте подтверждающие документы (файлы) — это ускорит проверку.</li>
            <li>Максимальный срок заполнения анкеты — <strong>${fillDays} дней</strong> с момента получения этого письма. После истечения срока потребуется повторный запрос ссылки.</li>
          </ul>
          <p>Если у вас возникнут вопросы по заполнению — обратитесь к представителю, направившему анкету.</p>
        `,
        );
      } catch (err) {
        this.logger.error(
          `Не удалось отправить ссылку на анкету ${questionnaireId} на адрес ${email}`,
          err instanceof Error ? err.stack : String(err),
        );
      }
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
            overrides: {
              select: { questionId: true, required: true },
            },
            filledByEmployee: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Ссылка не найдена!');
    }

    if (link.expiresAt < new Date()) {
      throw new ForbiddenException('Срок действия ссылки уже истек!');
    }

    if (!link.isActive) {
      if (!FILLABLE_STATUSES.includes(link.questionnaire.status)) {
        throw new ForbiddenException({
          message: 'Анкета уже была отправлена!',
          reason: ALREADY_SUBMITTED,
        });
      }
      throw new ForbiddenException('Ссылка неактивна!');
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
      data: { isActive: true, expiresAt: linkExpiryDate() },
    });
  }
}
