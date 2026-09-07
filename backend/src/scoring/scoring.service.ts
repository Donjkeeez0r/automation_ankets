import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RECOMMENDATIONS } from './recommendations';

// Варианты ответа «мера неприменима» для вопросов 1.2.8 / 1.2.10. Раньше они
// имели тип yesno_arch и сохранялись как «Не требуется по архитектуре
// Организации», сейчас — тип yesno_remote_access с текстом «Удалённый доступ
// отсутствует в сети». Сравнение идёт по значению ответа, а не по типу вопроса,
// поэтому оба варианта считаются эквивалентными: в базе остались ответы,
// сохранённые со старым текстом.
const ARCH_NOT_REQUIRED_VALUES = [
  'Удалённый доступ отсутствует в сети',
  'Не требуется по архитектуре Организации',
];

@Injectable()
export class ScoringService {
  constructor(private prismaService: PrismaService) {}

  getSectionRelevance(answers: Record<string, string>) {
    const gisRelevant =
      answers['1.3.1'] !== 'Нет' &&
      answers['1.3.1'] !== 'Не предполагается' &&
      !!answers['1.3.1'];

    const pdnRelevant =
      answers['1.4.1'] !== 'Нет' &&
      answers['1.4.1'] !== 'Не предполагается' &&
      !!answers['1.4.1'];

    const remoteRelevant = answers['1.1.10'] !== 'Нет' && !!answers['1.1.10'];
    const devRelevant = answers['1.1.11'] !== 'Нет' && !!answers['1.1.11'];
    const contractorsRelevant = answers['1.1.8'] === 'Да';

    return {
      gisRelevant,
      pdnRelevant,
      remoteRelevant,
      devRelevant,
      contractorsRelevant,
    };
  }

  async calculateScore(questionnaireId: string) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: { answers: { include: { question: true } } },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    const answers: Record<string, string> = {};
    for (const answer of questionnaire.answers) {
      answers[answer.question.code] = answer.value;
    }

    const auditScore = answers['1.2.1'] === 'Да' ? 1 : 0;

    const documentScore =
      answers['1.2.2'] === 'Да' &&
      answers['1.2.4'] === 'Да' &&
      answers['1.2.5'] === 'Да'
        ? 1
        : 0;

    const measuresScore =
      answers['1.1.5'] === 'Да' &&
      answers['1.2.7'] === 'Да' &&
      (answers['1.2.8'] === 'Да' ||
        ARCH_NOT_REQUIRED_VALUES.includes(answers['1.2.8']))
        ? 1
        : 0;

    const { gisRelevant, pdnRelevant, remoteRelevant, devRelevant } =
      this.getSectionRelevance(answers);

    const gisScore = !gisRelevant
      ? null
      : answers['1.3.2'] === 'Да' &&
          answers['1.3.3'] === 'Нет' &&
          answers['1.3.4'] === 'Нет' &&
          answers['1.3.1'] === 'Да'
        ? 1
        : 0;

    const pdnScore = !pdnRelevant
      ? null
      : answers['1.4.2'] === 'Да' &&
          answers['1.4.3'] === 'Да' &&
          answers['1.4.4'] === 'Да' &&
          answers['1.4.5'] === 'Да' &&
          answers['1.4.1'] === 'Да'
        ? 1
        : 0;

    const remoteAccessScore = !remoteRelevant
      ? null
      : ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9'].every(
            (code) => answers[code] === 'Да',
          )
        ? 1
        : 0;

    const devScore = !devRelevant
      ? null
      : ['3.1', '3.7', '3.8', '3.11', '3.13', '3.14'].every(
            (code) => answers[code] === 'Да',
          )
        ? 1
        : 0;

    const contractorsScore =
      answers['1.1.8'] === 'Нет' || !answers['1.1.8']
        ? 1
        : answers['4.2']
          ? 2
          : 0;

    const recommended = ![
      documentScore,
      measuresScore,
      gisScore,
      pdnScore,
      remoteAccessScore,
      devScore,
    ].some((s) => s === 0);

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

    const answers: Record<string, string> = {};
    for (const answer of questionnaire.answers) {
      answers[answer.question.code] = answer.value;
    }

    const result: { category: string; text: string }[] = [];

    const { gisRelevant, pdnRelevant, remoteRelevant, devRelevant } =
      this.getSectionRelevance(answers);

    for (const rec of [
      ...RECOMMENDATIONS.priority,
      ...RECOMMENDATIONS.second_wave,
    ]) {
      const answer = answers[rec.questionCode];
      if (rec.condition === 'not_yes' && answer !== 'Да') {
        result.push({ category: rec.category, text: rec.text });
      }
    }

    if (remoteRelevant) {
      for (const rec of RECOMMENDATIONS.remote_access) {
        const answer = answers[rec.questionCode];
        if (rec.condition === 'not_yes' && answer !== 'Да') {
          result.push({ category: rec.category, text: rec.text });
        }
      }
    }

    if (devRelevant) {
      for (const rec of RECOMMENDATIONS.software_dev) {
        const answer = answers[rec.questionCode];
        if (rec.condition === 'not_yes' && answer !== 'Да') {
          result.push({ category: rec.category, text: rec.text });
        }
      }
    }

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
