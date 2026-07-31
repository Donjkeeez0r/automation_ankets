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
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';
import { Public } from '../auth/decorators/public.decorator';

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

  @Get()
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
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

  // Публичный — нужен подрядчику на /fill/:token (без авторизации)
  @Get('questions')
  @Public()
  getAllQuestions() {
    return this.questionnaireService.getAllQuestions();
  }

  @Get(':id')
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  getQuestionnaire(@Param('id') questionnaireId: string) {
    return this.questionnaireService.getQuestionnaire(questionnaireId);
  }

  @Get(':id/scoring')
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  getScoring(@Param('id') questionnaireId: string) {
    return this.questionnaireService.getScoring(questionnaireId);
  }

  @Get(':id/recommendations')
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  getRecommendations(@Param('id') questionnaireId: string) {
    return this.questionnaireService.getReccomendation(questionnaireId);
  }

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
      dto.deadlineAt,
    );
  }

  @Post(':id/recalculate')
  @Roles(Role.EMPLOYEE)
  recalculate(@Param('id') questionnaireId: string) {
    return this.questionnaireService.recalculate(questionnaireId);
  }

  @Delete(':id')
  @Roles(Role.AUDITOR)
  remove(@Param('id') id: string) {
    return this.questionnaireService.remove(id);
  }
}
