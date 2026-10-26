import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Res,
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
import { SetOverridesDto } from './dto/question-override.dto';
import type { Response } from 'express';
import { MaturityService } from '../maturity/maturity.service';
import { SaveMaturityDto } from '../maturity/dto/save-maturity.dto';
import { UpdateTargetLevelDto } from '../maturity/dto/update-target-level.dto';
import { QuestionnaireAccessService } from '../access/questionnaire-access.service';
import type { AuthUser } from '../auth/types';
import { ChangeOwnerDto } from './dto/change-owner.dto';

// Права (см. docs/ROLES.md):
// - просмотр анкет — обе роли;
// - создание и любые изменения анкеты — только закреплённый за ней EMPLOYEE;
// - удаление — закреплённый EMPLOYEE или ADMIN;
// - общий банк вопросов и передача анкеты другому ответственному — только ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('questionnaire')
export class QuestionnaireController {
  constructor(
    private questionnaireService: QuestionnaireService,
    private maturityService: MaturityService,
    private access: QuestionnaireAccessService,
  ) {}

  @Post()
  @Roles(Role.EMPLOYEE)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateQuestionnaireDto) {
    return this.questionnaireService.createQuestionnaire(user.userId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  getAllQuestionnaires() {
    return this.questionnaireService.getAllQuestionnaires();
  }

  @Post('questions')
  @Roles(Role.ADMIN)
  createQuestion(@Body() dto: CreateQuestionDto) {
    return this.questionnaireService.createQuestion(dto);
  }

  @Patch('questions/:id')
  @Roles(Role.ADMIN)
  updateQuestion(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionnaireService.updateQuestion(id, dto);
  }

  @Delete('questions/:id')
  @Roles(Role.ADMIN)
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
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  getQuestionnaire(@Param('id') questionnaireId: string) {
    return this.questionnaireService.getQuestionnaire(questionnaireId);
  }

  @Get(':id/scoring')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  getScoring(@Param('id') questionnaireId: string) {
    return this.questionnaireService.getScoring(questionnaireId);
  }

  @Get(':id/recommendations')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  getRecommendations(@Param('id') questionnaireId: string) {
    return this.questionnaireService.getReccomendation(questionnaireId);
  }

  @Get(':id/activity-log')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  getActivityLog(@Param('id') questionnaireId: string) {
    return this.questionnaireService.getActivityLog(questionnaireId);
  }

  @Patch(':id/status')
  @Roles(Role.EMPLOYEE)
  async updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') questionnaireId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    await this.access.assertCanEdit(questionnaireId, user);
    return this.questionnaireService.updateStatus(
      questionnaireId,
      dto.status,
      dto.comment,
      dto.deadlineAt,
    );
  }

  @Patch(':id/owner')
  @Roles(Role.ADMIN)
  changeOwner(
    @Param('id') questionnaireId: string,
    @Body() dto: ChangeOwnerDto,
  ) {
    return this.questionnaireService.changeOwner(
      questionnaireId,
      dto.employeeId,
    );
  }

  @Post(':id/recalculate')
  @Roles(Role.EMPLOYEE)
  async recalculate(
    @CurrentUser() user: AuthUser,
    @Param('id') questionnaireId: string,
  ) {
    await this.access.assertCanEdit(questionnaireId, user);
    return this.questionnaireService.recalculate(questionnaireId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertCanDelete(id, user);
    return this.questionnaireService.remove(id);
  }

  @Patch(':id/question-overrides')
  @Roles(Role.EMPLOYEE)
  async setOverrides(
    @CurrentUser() user: AuthUser,
    @Param('id') questionnaireId: string,
    @Body() dto: SetOverridesDto,
  ) {
    await this.access.assertCanEdit(questionnaireId, user);
    return this.questionnaireService.setQuestionOverrides(
      questionnaireId,
      dto.overrides,
    );
  }

  @Get(':id/question-overrides')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  getOverrides(@Param('id') questionnaireId: string) {
    return this.questionnaireService.getQuestionOverrides(questionnaireId);
  }

  @Get(':id/recommendations/pdf')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  async downloadRecommendationsPdf(
    @Param('id') questionnaireId: string,
    @Res() res: Response,
  ) {
    return this.questionnaireService.generateRecommendationsPdf(
      questionnaireId,
      res,
    );
  }

  @Post(':id/send-recommendations')
  @Roles(Role.EMPLOYEE)
  async sendRecommendations(
    @CurrentUser() user: AuthUser,
    @Param('id') questionnaireId: string,
  ) {
    await this.access.assertCanEdit(questionnaireId, user);
    return this.questionnaireService.sendRecommendationsByEmail(
      questionnaireId,
    );
  }

  @Get(':id/maturity/result')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  getMaturityResult(@Param('id') questionnaireId: string) {
    return this.maturityService.getResult(questionnaireId);
  }

  @Patch(':id/maturity')
  @Roles(Role.EMPLOYEE)
  async updateMaturityItems(
    @CurrentUser() user: AuthUser,
    @Param('id') questionnaireId: string,
    @Body() dto: SaveMaturityDto,
  ) {
    await this.access.assertCanEdit(questionnaireId, user);
    return this.maturityService.updateItemsByEmployee(
      questionnaireId,
      dto.items,
    );
  }

  @Patch(':id/maturity/target-level')
  @Roles(Role.EMPLOYEE)
  async updateTargetLevel(
    @CurrentUser() user: AuthUser,
    @Param('id') questionnaireId: string,
    @Body() dto: UpdateTargetLevelDto,
  ) {
    await this.access.assertCanEdit(questionnaireId, user);
    return this.maturityService.updateTargetLevel(
      questionnaireId,
      dto.targetLevel,
      dto.objectCategory,
    );
  }
}
