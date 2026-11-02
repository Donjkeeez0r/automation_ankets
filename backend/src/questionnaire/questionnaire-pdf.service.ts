import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { MaturityService } from '../maturity/maturity.service';
import { QuestionnaireType, Status } from '../generated/prisma';
import { REQUIREMENT_KEYS } from '../maturity/maturity.constants';
import {
  PdfHeaderData,
  renderMaturityPdf,
  renderSecurityPdf,
} from './questionnaire-pdf.renderer';

// Подписи статусов — как в интерфейсе (frontend/src/components/StatusBadge.tsx)
const STATUS_LABELS: Record<Status, string> = {
  DRAFT: 'Не заполнена',
  SUBMITTED: 'На проверке',
  IN_REVIEW: 'На проверке',
  APPROVED: 'Прошёл',
  DECLINED: 'Не прошёл',
  REVISION: 'На доработке',
  FAILED: 'Не прошёл',
};

export interface QuestionnairePdf {
  buffer: Buffer;
  fileName: string;
}

// Выгрузка заполненной анкеты (ИБ или оценки зрелости) в PDF
@Injectable()
export class QuestionnairePdfService {
  constructor(
    private prismaService: PrismaService,
    private scoringService: ScoringService,
    private maturityService: MaturityService,
  ) {}

  async generate(questionnaireId: string): Promise<QuestionnairePdf> {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        company: { select: { name: true, inn: true } },
        filledByEmployee: { select: { name: true } },
        employee: { select: { name: true } },
        answers: { include: { question: { select: { code: true } } } },
        artifacts: {
          select: { fileName: true, type: true, questionId: true },
          orderBy: { uploadedAt: 'asc' },
        },
        maturityItems: { orderBy: { direction: 'asc' } },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    if (questionnaire.status === Status.DRAFT) {
      throw new BadRequestException(
        'PDF доступен после отправки анкеты подрядчиком',
      );
    }

    const generatedAt = new Date();
    const header: PdfHeaderData = {
      companyName: questionnaire.company.name,
      companyInn: questionnaire.company.inn,
      filledBy: questionnaire.filledByEmployee?.name ?? null,
      owner: questionnaire.employee.name,
      createdAt: questionnaire.createdAt,
      status: STATUS_LABELS[questionnaire.status] ?? questionnaire.status,
      generatedAt,
    };

    let buffer: Buffer;

    if (questionnaire.type === QuestionnaireType.MATURITY) {
      const result = await this.maturityService.getResult(questionnaireId);
      buffer = await renderMaturityPdf({
        header,
        comment: questionnaire.comment,
        result,
        values: Object.fromEntries(
          questionnaire.maturityItems.map((item) => [
            item.direction,
            Object.fromEntries(REQUIREMENT_KEYS.map((k) => [k, item[k]])),
          ]),
        ),
      });
    } else {
      const questions = await this.prismaService.question.findMany({
        orderBy: [{ section: 'asc' }, { order: 'asc' }],
      });

      const answersByCode: Record<string, string> = {};
      for (const a of questionnaire.answers) {
        answersByCode[a.question.code] = a.value;
      }

      buffer = await renderSecurityPdf({
        header,
        comment: questionnaire.comment,
        questions,
        answers: questionnaire.answers,
        files: questionnaire.artifacts,
        relevance: this.scoringService.getSectionRelevance(answersByCode),
      });
    }

    return {
      buffer,
      fileName: `Анкета_${safeFilePart(questionnaire.company.name)}_${generatedAt.toLocaleDateString('ru-RU')}.pdf`,
    };
  }
}

// Название компании в имени файла: без символов, запрещённых в Windows/macOS
function safeFilePart(value: string): string {
  return (
    value
      .replace(/[\\/:*?"<>|]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'компания'
  );
}
