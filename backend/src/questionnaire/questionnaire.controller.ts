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
      dto.contractorId,
    );
  }

  @Post(':id/answers')
  @Roles(Role.CONTRACTOR)
  saveAnswers(
    @Param('id') questionnaireId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.questionnaireService.saveAnswers(questionnaireId, dto.answers);
  }

  @Post(':id/submit')
  @Roles(Role.CONTRACTOR)
  submitQuestionnaire(
    @Param('id') questionnaireId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.questionnaireService.submitQuestionnaire(
      questionnaireId,
      user.userId,
    );
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

  @Get('my')
  @Roles(Role.CONTRACTOR)
  getMyQuestionnaires(@CurrentUser() user: { userId: string }) {
    return this.questionnaireService.getMyQuestionnaires(user.userId);
  }

  @Get(':id')
  getQuestionnaire(
    @Param('id') questionnaireId: string,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    return this.questionnaireService.getQuestionnaire(
      questionnaireId,
      user.userId,
      user.role,
    );
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

  @Get(':id/my-recommendations')
  @Roles(Role.CONTRACTOR)
  getMyRecommendations(
    @Param('id') questionnaireId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.questionnaireService.getMyRecommendations(
      questionnaireId,
      user.userId,
    );
  }

  @Patch(':id/status')
  @Roles(Role.EMPLOYEE)
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
}
