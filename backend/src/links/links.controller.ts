import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { LinksService } from './links.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { QuestionnaireService } from '../questionnaire/questionnaire.service';
import { SubmitAnswerDto } from '../questionnaire/dto/submit-answer.dto';

@Controller('links')
export class LinksController {
  constructor(
    private linksService: LinksService,
    private questionnaireService: QuestionnaireService,
  ) {}

  @Post('questionnaire/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE)
  createLink(@Param('id') questionnaireId: string) {
    return this.linksService.createLink(questionnaireId);
  }

  @Get(':token')
  getByToken(@Param('token') token: string) {
    return this.linksService.findByToken(token);
  }

  @Post(':token/answers')
  async saveAnswers(
    @Param('token') token: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    const link = await this.linksService.findByToken(token);
    return this.questionnaireService.saveAnswers(
      link.questionnaireId,
      dto.answers,
    );
  }

  @Post(':token/submit')
  async submit(@Param('token') token: string) {
    const link = await this.linksService.findByToken(token);
    const result = await this.questionnaireService.submitQuestionnaire(
      link.questionnaireId,
    );
    await this.linksService.deactivate(token);
    return result;
  }
}
