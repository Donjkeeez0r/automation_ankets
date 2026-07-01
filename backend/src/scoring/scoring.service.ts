import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RECOMMENDATIONS } from './recommendations';

@Injectable()
export class ScoringService {
  constructor(private prismaService: PrismaService) {}
  async calculateScore(questionnaireId: string) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        answers: {
          include: { question: true },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    const answers: Record<string, string> = {};
    for (const answer of questionnaire.answers) {
      answers[answer.question.code] = answer.value;
    }

    // Блок 1 — Внешний аудит (не влияет на итог, но показывается)
    const auditScore = answers['1.2.1'] === 'Да' ? 1 : 0;

    // Блок 2 — Документы по ИБ
    const documentScore =
      answers['1.2.2'] === 'Да' &&
      answers['1.2.4'] === 'Да' &&
      answers['1.2.5'] === 'Да'
        ? 1
        : 0;

    // Блок 3 — Меры ИБ
    const measuresScore =
      answers['1.1.5'] === 'Да' &&
      answers['1.2.7'] === 'Да' &&
      (answers['1.2.8'] === 'Да' ||
        answers['1.2.8'] === 'Не требуется по архитектуре Организации')
        ? 1
        : 0;

    // Блок 4 — ГИС
    const gisRelevant = answers['1.3.1'] !== 'Нет';
    const gisScore = !gisRelevant
      ? null
      : answers['1.3.2'] === 'Да' &&
          answers['1.3.3'] === 'Нет' &&
          answers['1.3.4'] === 'Нет' &&
          answers['1.3.1'] === 'Да'
        ? 1
        : 0;

    // Блок 5 — ПДн
    const pdnRelevant = answers['1.4.1'] !== 'Нет';
    const pdnScore = !pdnRelevant
      ? null
      : answers['1.4.2'] === 'Да' &&
          answers['1.4.3'] === 'Да' &&
          answers['1.4.4'] === 'Да' &&
          answers['1.4.5'] === 'Да'
        ? 1
        : 0;

    // Блок 6 — Удалённый доступ
    const remoteRelevant = answers['1.1.10'] !== 'Нет';
    const remoteAccessScore = !remoteRelevant
      ? null
      : ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9'].every(
            (code) => answers[code] === 'Да',
          )
        ? 1
        : 0;

    // Блок 7 — Разработка ПО
    const devRelevant = answers['1.1.11'] !== 'Нет';
    const devScore = !devRelevant
      ? null
      : ['3.1', '3.9', '3.10', '3.14', '3.16', '3.17'].every(
            (code) => answers[code] === 'Да',
          )
        ? 1
        : 0;

    // Блок 8 — Подрядчики
    const contractorsScore = answers['1.1.8'] !== 'Да' ? 1 : 2;

    // Итог — auditScore не влияет на рекомендацию!
    const recommended = ![
      documentScore,
      measuresScore,
      gisScore,
      pdnScore,
      remoteAccessScore,
      devScore,
    ].some((s) => s === 0);

    // Сохраняем результат (upsert — если уже есть, обновляем)
    const result = await this.prismaService.scoringResult.upsert({
      where: { questionnaireId },
      update: {
        auditScore,
        documentScore,
        measuresScore,
        gisScore,
        pdnScore,
        remoteAccessScore,
        devScore,
        contractorsScore,
        recommended,
      },
      create: {
        questionnaireId,
        auditScore,
        documentScore,
        measuresScore,
        gisScore,
        pdnScore,
        remoteAccessScore,
        devScore,
        contractorsScore,
        recommended,
      },
    });

    return result;
  }

  async getRecommendations(questionnaireId: string) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        answers: {
          include: { question: true },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    // Словарь ответов
    const answers: Record<string, string> = {};
    for (const answer of questionnaire.answers) {
      answers[answer.question.code] = answer.value;
    }

    const result: { category: string; text: string }[] = [];

    // Проверка каждой рекомендации
    const remoteRelevant = answers['1.1.10'] !== 'Нет';
    const devRelevant = answers['1.1.11'] !== 'Нет';
    const gisRelevant = answers['1.3.1'] === 'Да';
    const pdnRelevant = answers['1.4.1'] === 'Да';

    for (const rec of [
      ...RECOMMENDATIONS.priority,
      ...RECOMMENDATIONS.second_wave,
    ]) {
      const answer = answers[rec.questionCode];
      if (rec.condition === 'not_yes' && answer !== 'Да') {
        result.push({ category: rec.category, text: rec.text });
      }
    }

    // Удаленный доступ
    if (remoteRelevant) {
      for (const rec of RECOMMENDATIONS.remote_access) {
        const answer = answers[rec.questionCode];
        if (rec.condition === 'not_yes' && answer !== 'Да') {
          result.push({ category: rec.category, text: rec.text });
        }
      }
    }

    // Разработка ПО
    if (devRelevant) {
      for (const rec of RECOMMENDATIONS.software_dev) {
        const answer = answers[rec.questionCode];
        if (rec.condition === 'not_yes' && answer !== 'Да') {
          result.push({ category: rec.category, text: rec.text });
        }
      }
    }

    // ГИС
    if (gisRelevant) {
      for (const rec of RECOMMENDATIONS.gis) {
        const answer = answers[rec.questionCode];
        const triggered =
          rec.condition === 'not_yes' ? answer !== 'Да' : answer === 'Да';
        if (triggered) {
          result.push({ category: rec.category, text: rec.text });
        }
      }
    }

    // ПДн
    if (pdnRelevant) {
      for (const rec of RECOMMENDATIONS.pdn) {
        const answer = answers[rec.questionCode];
        if (rec.condition === 'not_yes' && answer !== 'Да') {
          result.push({ category: rec.category, text: rec.text });
        }
      }
    }

    return result;
  }
}
