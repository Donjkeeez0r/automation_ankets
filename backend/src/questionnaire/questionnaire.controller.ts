import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../generated/prisma';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('questionnaire')
export class QuestionnaireController {
  constructor(private questionnaireService: QuestionnaireService) {}

  @Post()
  @Roles(Role.EMPLOYEE)
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateQuestionnaireDto,
  ) {
    return this.questionnaireService.createQuestionnaire(
      user.userId,
      dto.companyId,
    );
  }

  // TODO: этот эндпоинт станет доступен по токену вместо JWT,
  // когда добавим механизм одноразовой ссылки для подрядчика
  @Post(':id/answers')
  saveAnswers(
    @Param('id') questionnaireId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.questionnaireService.saveAnswers(questionnaireId, dto.answers);
  }

  // TODO: то же самое — станет доступен по токену
  @Post(':id/submit')
  submitQuestionnaire(@Param('id') questionnaireId: string) {
    return this.questionnaireService.submitQuestionnaire(questionnaireId);
  }

  @Get()
  @Roles(Role.EMPLOYEE)
  getAllQuestionnaires() {
    return this.questionnaireService.getAllQuestionnaires();
  }

  @Post('questions')
  @Roles(Role.EMPLOYEE)
  createQuestion(@Body() dto: CreateQuestionDto) {
    return this.questionnaireService.createQuestion(dto);
  }

  @Patch('questions/:id')
  @Roles(Role.EMPLOYEE)
  updateQuestion(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionnaireService.updateQuestion(id, dto);
  }

  @Delete('questions/:id')
  @Roles(Role.EMPLOYEE)
  deleteQuestion(@Param('id') id: string) {
    return this.questionnaireService.deleteQuestion(id);
  }

  @Get('questions')
  getAllQuestions() {
    return this.questionnaireService.getAllQuestions();
  }

  // TODO: раньше был "мои анкеты" для залогиненного подрядчика — убран,
  // подрядчик больше не логинится. Вернётся в другом виде, если понадобится.

  // TODO: без проверки владения — станет доступен по токену
  @Get(':id')
  getQuestionnaire(@Param('id') questionnaireId: string) {
    return this.questionnaireService.getQuestionnaire(questionnaireId);
  }

  @Get(':id/scoring')
  @Roles(Role.EMPLOYEE)
  getScoring(@Param('id') questionnaireId: string) {
    return this.questionnaireService.getScoring(questionnaireId);
  }

  @Get(':id/recommendations')
  @Roles(Role.EMPLOYEE)
  getRecommendations(@Param('id') questionnaireId: string) {
    return this.questionnaireService.getReccomendation(questionnaireId);
  }

  // TODO: "мои рекомендации" для подрядчика — убран вместе с getMyRecommendations
  // в сервисе, вернётся через токен

  @Patch(':id/status')
  @Roles(Role.AUDITOR)
  updateStatus(
    @Param('id') questionnaireId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.questionnaireService.updateStatus(
      questionnaireId,
      dto.status,
      dto.comment,
    );
  }

  @Post(':id/recalculate')
  @Roles(Role.EMPLOYEE)
  recalculate(@Param('id') questionnaireId: string) {
    return this.questionnaireService.recalculate(questionnaireId);
  }
}
