import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnswerDto } from './dto/answer.dto';
import { ScoringService } from '../scoring/scoring.service';
import { Status } from '../generated/prisma';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { LinksService } from '../links/links.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class QuestionnaireService {
  constructor(
    private prismaService: PrismaService,
    private scoringService: ScoringService,
    @Inject(forwardRef(() => LinksService))
    private linksService: LinksService,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
  ) {}

  async getAllQuestions() {
    return this.prismaService.question.findMany({
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
    });
  }

  async createQuestionnaire(employeeId: string, companyId: string) {
    try {
      const questionnaire = await this.prismaService.questionnaire.create({
        data: {
          employeeId,
          companyId,
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

  async getQuestionnaire(questionnaireId: string) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        answers: {
          include: {
            question: true,
          },
        },
        company: {
          select: {
            name: true,
            inn: true,
            contactName: true,
            contactEmail: true,
          },
        },
      },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    return questionnaire;
  }

  async submitQuestionnaire(questionnaireId: string) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: { answers: { include: { question: true } }, company: true },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    if (!['DRAFT', 'REVISION'].includes(questionnaire.status)) {
      throw new BadRequestException('Анкета уже была отправлена!');
    }

    const updated = await this.prismaService.questionnaire.update({
      where: { id: questionnaireId },
      data: { status: 'SUBMITTED' },
    });

    await this.scoringService.calculateScore(questionnaireId);

    const auditorEmails = await this.usersService.getAuditorEmails();
    for (const email of auditorEmails) {
      await this.notificationsService.sendMail(
        email,
        'Новая анкета на проверку',
        `
          <p>Поступила новая анкета от компании «${questionnaire.company.name}» для проверки.</p>
          <p>Проверьте её в системе анкетирования.</p>
        `,
      );
    }

    return updated;
  }

  async getAllQuestionnaires() {
    return this.prismaService.questionnaire.findMany({
      include: {
        company: {
          select: {
            name: true,
            inn: true,
            contactName: true,
            contactEmail: true,
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
    deadlineAt?: string,
  ) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    const updated = await this.prismaService.questionnaire.update({
      where: { id: questionnaireId },
      data: {
        status,
        comment,
        deadlineAt: deadlineAt ? new Date(deadlineAt) : undefined,
        deadlineNotifiedAt: status === 'REVISION' ? null : undefined,
      },
    });

    if (status === 'REVISION') {
      await this.linksService.reactivateByQuestionnaireId(questionnaireId);
    }

    return updated;
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

  async recalculate(questionnaireId: string) {
    return this.scoringService.calculateScore(questionnaireId);
  }

  async remove(id: string) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    await this.prismaService.questionnaire.delete({ where: { id } });

    return { message: 'Анкета удалена!' };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async checkDeadlines() {
    const now = new Date();

    const overdueQuestionnaires =
      await this.prismaService.questionnaire.findMany({
        where: {
          status: 'REVISION',
          deadlineAt: { lte: now },
          deadlineNotifiedAt: null,
        },
        include: { company: true },
      });

    if (overdueQuestionnaires.length === 0) {
      return;
    }

    const auditorEmails = await this.usersService.getAuditorEmails();

    for (const questionnaire of overdueQuestionnaires) {
      for (const email of auditorEmails) {
        await this.notificationsService.sendMail(
          email,
          'Просрочен дедлайн дозаполнения анкеты',
          `
          <p>У компании «${questionnaire.company.name}» истёк срок дозаполнения анкеты (дедлайн: ${questionnaire.deadlineAt?.toLocaleDateString('ru-RU')}).</p>
          <p>Требуется проверка в системе анкетирования.</p>
          `,
        );
      }

      await this.prismaService.questionnaire.update({
        where: { id: questionnaire.id },
        data: { deadlineNotifiedAt: now },
      });
    }
  }
}
