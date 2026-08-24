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

  async createLink(questionnaireId: string) {
    const token = randomBytes(32).toString('hex');

    const link = await this.prismaService.questionnaireLink.create({
      data: { token, expiresAt: linkExpiryDate(), questionnaireId },
      include: {
        questionnaire: {
          include: { company: true },
        },
      },
    });

    const fillUrl = `${process.env.FRONTEND_URL}/fill/${token}`;

    // Ссылка уже создана в БД, поэтому сбой SMTP не должен ронять ответ:
    // сотрудник в любом случае может скопировать ссылку из интерфейса.
    for (const email of link.questionnaire.company.contactEmails) {
      // Каждый адрес обрабатываем отдельно: недействительный контакт одного
      // получателя не должен обрывать рассылку остальным.
      try {
        await this.notificationsService.sendMail(
          email,
          'Анкета информационной безопасности',
          `
          <p>Здравствуйте, ${link.questionnaire.company.contactName}!</p>
          <p>Для продолжения сотрудничества просим заполнить анкету информационной безопасности по ссылке ниже.</p>
          <p><a href="${fillUrl}">${fillUrl}</a></p>
          <p>Ссылка действительна ${LINK_LIFETIME_DAYS} дней.</p>
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
            // Индивидуальная обязательность вопросов для этой анкеты —
            // подрядчик должен видеть актуальные правила при заполнении
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

    // Срок проверяем раньше активности: протухшая ссылка — это именно
    // недоступность, даже если анкета к тому моменту уже была отправлена.
    if (link.expiresAt < new Date()) {
      throw new ForbiddenException('Срок действия ссылки уже истек!');
    }

    if (!link.isActive) {
      // Ссылку деактивирует submit — отличаем этот случай от отзыва ссылки,
      // чтобы подрядчик увидел экран подтверждения, а не ошибку.
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

  // Вызывается при переводе анкеты в REVISION. Срок продлеваем заново, иначе
  // у подрядчика на дозаполнение остался бы хвост от первичных 30 дней —
  // вплоть до уже истёкшей ссылки, если правки запросили спустя месяц.
  async reactivateByQuestionnaireId(questionnaireId: string) {
    return this.prismaService.questionnaireLink.updateMany({
      where: { questionnaireId },
      data: { isActive: true, expiresAt: linkExpiryDate() },
    });
  }
}
