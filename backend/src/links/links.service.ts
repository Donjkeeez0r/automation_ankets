import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { escapeHtml } from '../notifications/escape-html';
import { CONTRACTOR_EMPLOYEE_SELECT } from '../companies/companies.service';
import { Status } from '../generated/prisma';
import { DEFAULT_FILL_DAYS } from './dto/create-link.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';

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

// 1 день, 2 дня, 5 дней, 11 дней, 21 день
function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  constructor(
    private prismaService: PrismaService,
    private notificationsService: NotificationsService,
    private activityLogService: ActivityLogService,
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
          include: {
            company: true,
            employee: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    await this.prismaService.questionnaire.update({
      where: { id: questionnaireId },
      data: { fillDeadlineAt },
    });

    const fillUrl = `${process.env.FRONTEND_URL}/fill/${token}`;

    await this.activityLogService.log(
      questionnaireId,
      'LINK_CREATED',
      `Создана ссылка на анкету, срок заполнения — ${fillDays} дн.`,
    );

    // Единственное письмо, которое уходит всегда: ссылка отправляется
    // сотруднику, создавшему анкету, — он сам пересылает её подрядчику.
    const { employee, company } = link.questionnaire;
    const isMaturity = link.questionnaire.type === 'MATURITY';
    const docName = isMaturity ? 'оценку уровня зрелости' : 'анкету';
    const companyName = escapeHtml(company.name);
    const safeUrl = escapeHtml(fillUrl);

    let emailSent = false;
    try {
      await this.notificationsService.sendEssentialMail(
        employee.email,
        `Ссылка на ${docName} для компании «${company.name}»`,
        `
          <p>Здравствуйте, ${escapeHtml(employee.name)}!</p>
          <p>Ссылка на ${docName} для компании «${companyName}»: <a href="${safeUrl}">${safeUrl}</a></p>
          <p>Срок заполнения — <strong>${fillDays} ${pluralDays(fillDays)}</strong>.</p>
          <p>Перешлите её подрядчику.</p>
        `,
      );
      emailSent = true;
    } catch (err) {
      this.logger.error(
        `Не удалось отправить ссылку на анкету ${questionnaireId} на адрес ${employee.email}`,
        err instanceof Error ? err.stack : String(err),
      );
    }

    return { ...link, sentTo: employee.email, emailSent };
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
            filledByEmployee: { select: CONTRACTOR_EMPLOYEE_SELECT },
            maturityItems: { orderBy: { direction: 'asc' } },
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
