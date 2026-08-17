import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LinksService } from './links.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { QuestionnaireService } from '../questionnaire/questionnaire.service';
import { SubmitAnswerDto } from '../questionnaire/dto/submit-answer.dto';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('links')
export class LinksController {
  private readonly logger = new Logger(LinksController.name);

  constructor(
    private linksService: LinksService,
    private questionnaireService: QuestionnaireService,
    private artifactsService: ArtifactsService,
  ) {}

  @Post('questionnaire/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE)
  createLink(@Param('id') questionnaireId: string) {
    return this.linksService.createLink(questionnaireId);
  }

  @Post(':token/artifacts')
  @UseInterceptors(FileInterceptor('file'))
  async uploadArtifact(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('questionId') questionId?: string,
  ) {
    const link = await this.linksService.findByToken(token);
    return this.artifactsService.saveFile(
      link.questionnaireId,
      file,
      questionId,
    );
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
    // Анкета уже переведена в SUBMITTED — если деактивация ссылки упадёт,
    // подрядчик всё равно должен получить успешный ответ.
    try {
      await this.linksService.deactivate(token);
    } catch (err) {
      this.logger.error(
        `Не удалось деактивировать ссылку ${token}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
    return result;
  }

  @Get(':token/artifacts')
  async getArtifacts(@Param('token') token: string) {
    const link = await this.linksService.findByToken(token);
    return this.artifactsService.getByQuestionnaire(link.questionnaireId);
  }

  @Delete(':token/artifacts/:artifactId')
  async deleteArtifact(
    @Param('token') token: string,
    @Param('artifactId') artifactId: string,
  ) {
    const link = await this.linksService.findByToken(token); // проверяем что ссылка валидна
    const artifact = await this.artifactsService.getById(artifactId);

    // Ссылка даёт доступ только к файлам своей анкеты — иначе по известному id
    // можно было бы удалить артефакт чужой анкеты.
    if (artifact.questionnaireId !== link.questionnaireId) {
      throw new NotFoundException('Файл не найден!');
    }

    return this.artifactsService.remove(artifactId);
  }
}
