import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnswerDto } from './dto/answer.dto';
import { ScoringService } from '../scoring/scoring.service';
import { Status } from '../generated/prisma';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

@Injectable()
export class QuestionnaireService {
  constructor(
    private prismaService: PrismaService,
    private scoringService: ScoringService,
  ) {}

  async getAllQuestions() {
    return this.prismaService.question.findMany({
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
    });
  }

  async createQuestionnaire(employeeId: string, contractorId: string) {
    try {
      const questionnaire = await this.prismaService.questionnaire.create({
        data: {
          employeeId,
          contractorId,
        },
      });
      return questionnaire;
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Не удалось создать анкету!');
    }
  }

  async saveAnswers(questionnaireId: string, answers: AnswerDto[]) {
    for (const answer of answers) {
      await this.prismaService.answer.upsert({
        where: {
          questionnaireId_questionId: {
            questionnaireId,
            questionId: answer.questionId,
          },
        },
        update: {
          value: answer.value,
          additionalValue: answer.additionalValue,
        },
        create: {
          questionnaireId,
          questionId: answer.questionId,
          value: answer.value,
          additionalValue: answer.additionalValue,
        },
      });
    }

    return { message: 'Ответы сохранены' };
  }

  async getQuestionnaire(
    questionnaireId: string,
    userId: string,
    userRole?: string,
  ) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
        contractor: {
          select: { name: true, organization: true, email: true },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    if (userRole !== 'EMPLOYEE' && questionnaire.contractorId !== userId) {
      throw new ForbiddenException('Доступ запрещён!');
    }

    return questionnaire;
  }

  async submitQuestionnaire(questionnaireId: string, userId: string) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: { answers: { include: { question: true } } },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    if (questionnaire.contractorId !== userId) {
      throw new ForbiddenException('Доступ запрещён!');
    }

    if (!['DRAFT', 'REVISION'].includes(questionnaire.status)) {
      throw new BadRequestException('Анкета уже была отправлена!');
    }

    const updated = await this.prismaService.questionnaire.update({
      where: { id: questionnaireId },
      data: { status: 'SUBMITTED' },
    });

    await this.scoringService.calculateScore(questionnaireId);

    return updated;
  }

  async getAllQuestionnaires() {
    return this.prismaService.questionnaire.findMany({
      include: {
        contractor: {
          select: {
            name: true,
            organization: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getScoring(questionnaireId: string) {
    const scoring = await this.prismaService.scoringResult.findUnique({
      where: { questionnaireId },
    });

    if (!scoring) {
      throw new NotFoundException('Скоринг не найден!');
    }

    return scoring;
  }

  async getReccomendation(questionnaireId: string) {
    return this.scoringService.getRecommendations(questionnaireId);
  }

  async updateStatus(
    questionnaireId: string,
    status: Status,
    comment?: string,
  ) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    return this.prismaService.questionnaire.update({
      where: { id: questionnaireId },
      data: {
        status,
        comment,
      },
    });
  }

  async getMyQuestionnaires(userId: string) {
    return this.prismaService.questionnaire.findMany({
      where: { contractorId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuestion(dto: CreateQuestionDto) {
    const existing = await this.prismaService.question.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(
        `Вопрос с кодом ${dto.code} уже существует!`,
      );
    }

    return this.prismaService.question.create({
      data: dto,
    });
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    const question = await this.prismaService.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Вопрос не найден!');
    }

    return this.prismaService.question.update({
      where: { id },
      data: dto,
    });
  }

  async deleteQuestion(id: string) {
    const question = await this.prismaService.question.findUnique({
      where: { id },
    });

    if (!question) {
      throw new NotFoundException('Вопрос не найден!');
    }

    await this.prismaService.question.delete({
      where: { id },
    });

    return { message: 'Вопрос удален!' };
  }

  async getMyRecommendations(questionnaireId: string, userId: string) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    if (questionnaire.contractorId !== userId) {
      throw new ForbiddenException('Доступ запрещен!');
    }

    if (!['APPROVED', 'REVISION', 'DECLINED'].includes(questionnaire.status)) {
      throw new ForbiddenException(
        'Рекомендации недоступны до проверки анкеты!',
      );
    }

    return this.scoringService.getRecommendations(questionnaireId);
  }

  async recalculate(questionnaireId: string) {
    return this.scoringService.calculateScore(questionnaireId);
  }
}
