import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { MaturityItem, QuestionnaireType, Status } from '../generated/prisma';
import {
  DIRECTIONS,
  REQUIREMENT_KEYS,
  REQUIREMENT_TYPES,
} from './maturity.constants';
import {
  calcAssessment,
  getLevelName,
  RequirementValues,
} from './maturity.calculator';
import { MaturityItemDto } from './dto/save-maturity.dto';

// Сотрудник правит значения только во время проверки
const EDITABLE_BY_EMPLOYEE: Status[] = ['SUBMITTED', 'IN_REVIEW'];

const directionTitle = (id: number) =>
  DIRECTIONS.find((d) => d.id === id)?.title ?? `Направление ${id}`;

const requirementTitle = (key: string) =>
  REQUIREMENT_TYPES.find((t) => t.key === key)?.title ?? key;

const formatValue = (v: number | null) =>
  v === null ? '—' : String(v).replace('.', ',');

@Injectable()
export class MaturityService {
  constructor(
    private prismaService: PrismaService,
    private activityLogService: ActivityLogService,
  ) {}

  private async getMaturityQuestionnaire(questionnaireId: string) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: { maturityItems: { orderBy: { direction: 'asc' } } },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    if (questionnaire.type !== QuestionnaireType.MATURITY) {
      throw new BadRequestException(
        'Действие доступно только для оценки уровня зрелости',
      );
    }

    return questionnaire;
  }

  private toValues(item: MaturityItem): RequirementValues {
    return Object.fromEntries(
      REQUIREMENT_KEYS.map((key) => [key, item[key]]),
    ) as RequirementValues;
  }

  private async applyItems(questionnaireId: string, items: MaturityItemDto[]) {
    await this.prismaService.$transaction(
      items.map((item) =>
        this.prismaService.maturityItem.update({
          where: {
            questionnaireId_direction: {
              questionnaireId,
              direction: item.direction,
            },
          },
          data: {
            notApplicable: item.notApplicable,
            comment: item.comment,
            ...Object.fromEntries(
              REQUIREMENT_KEYS.map((key) => [key, item[key]]),
            ),
          },
        }),
      ),
    );
  }

  //Подрядчик
  async saveItems(questionnaireId: string, items: MaturityItemDto[]) {
    await this.getMaturityQuestionnaire(questionnaireId);
    await this.applyItems(questionnaireId, items);
    return { message: 'Ответы сохранены' };
  }

  async validateForSubmit(questionnaireId: string) {
    const { maturityItems: items } =
      await this.getMaturityQuestionnaire(questionnaireId);

    const applicable = items.filter((i) => !i.notApplicable);

    if (applicable.length === 0) {
      throw new BadRequestException(
        'Все направления отмечены как неприменимые — оценка невозможна',
      );
    }

    const incompleteDirections = applicable
      .filter((i) => REQUIREMENT_KEYS.some((key) => i[key] === null))
      .map((i) => i.direction);

    const missingReasonDirections = items
      .filter((i) => i.notApplicable && !i.comment?.trim())
      .map((i) => i.direction);

    if (incompleteDirections.length || missingReasonDirections.length) {
      throw new BadRequestException({
        message: 'Оценка заполнена не полностью',
        incompleteDirections,
        missingReasonDirections,
      });
    }
  }

  //Сотрудник
  async getResult(questionnaireId: string) {
    const questionnaire = await this.getMaturityQuestionnaire(questionnaireId);
    const targetLevel = questionnaire.targetLevel ?? 0;

    const result = calcAssessment(
      questionnaire.maturityItems.map((item) => ({
        direction: item.direction,
        notApplicable: item.notApplicable,
        values: this.toValues(item),
      })),
      targetLevel,
    );

    // Добавляем названия, чтобы фронту и будущему PDF-отчёту не нужен был справочник
    return {
      ...result,
      targetLevel,
      targetLevelName: getLevelName(targetLevel),
      directions: result.directions.map((d) => ({
        ...d,
        title: directionTitle(d.direction),
        levelName: d.level === null ? null : getLevelName(d.level),
        gapTitles: d.gaps.map(requirementTitle),
      })),
    };
  }

  async updateItemsByEmployee(
    questionnaireId: string,
    items: MaturityItemDto[],
  ) {
    const questionnaire = await this.getMaturityQuestionnaire(questionnaireId);

    if (!EDITABLE_BY_EMPLOYEE.includes(questionnaire.status)) {
      throw new BadRequestException(
        'Изменять значения можно только у анкеты, находящейся на проверке',
      );
    }

    // Собираем, что именно поменялось, — для истории анкеты
    const before = new Map(
      questionnaire.maturityItems.map((i) => [i.direction, i]),
    );
    const changes: string[] = [];

    for (const item of items) {
      const old = before.get(item.direction);
      if (!old) continue;

      const parts: string[] = [];

      if (
        item.notApplicable !== undefined &&
        item.notApplicable !== old.notApplicable
      ) {
        parts.push(
          item.notApplicable
            ? 'отмечено как неприменимое'
            : 'снята отметка «неприменимо»',
        );
      }

      for (const key of REQUIREMENT_KEYS) {
        const next = item[key];
        if (next !== undefined && next !== old[key]) {
          parts.push(
            `${requirementTitle(key)}: ${formatValue(old[key])} → ${formatValue(next)}`,
          );
        }
      }

      if (
        item.comment !== undefined &&
        (item.comment ?? '') !== (old.comment ?? '')
      ) {
        parts.push('изменён комментарий');
      }

      if (parts.length) {
        changes.push(
          `«${directionTitle(item.direction)}»: ${parts.join(', ')}`,
        );
      }
    }

    if (changes.length === 0) {
      return { message: 'Изменений нет' };
    }

    await this.applyItems(questionnaireId, items);

    await this.activityLogService.log(
      questionnaireId,
      'MATURITY_VALUES_EDITED',
      `Сотрудник изменил значения оценки. ${changes.join('; ')}`,
    );

    return { message: 'Значения обновлены' };
  }

  async updateTargetLevel(questionnaireId: string, targetLevel: number) {
    const questionnaire = await this.getMaturityQuestionnaire(questionnaireId);

    if (questionnaire.targetLevel === targetLevel) {
      return { message: 'Изменений нет' };
    }

    await this.prismaService.questionnaire.update({
      where: { id: questionnaireId },
      data: { targetLevel },
    });

    await this.activityLogService.log(
      questionnaireId,
      'TARGET_LEVEL_CHANGED',
      `Целевой уровень зрелости изменён: ${questionnaire.targetLevel ?? '—'} → ${targetLevel}`,
    );

    return { message: 'Целевой уровень обновлён' };
  }
}
