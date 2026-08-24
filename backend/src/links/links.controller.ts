import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { LinksService } from './links.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { QuestionnaireService } from '../questionnaire/questionnaire.service';
import { SubmitAnswerDto } from '../questionnaire/dto/submit-answer.dto';
import { ArtifactsService } from '../artifacts/artifacts.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CompaniesService } from '../companies/companies.service';
import { CreateLinkDto } from './dto/create-link.dto';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Controller('links')
export class LinksController {
  private readonly logger = new Logger(LinksController.name);

  constructor(
    private linksService: LinksService,
    private questionnaireService: QuestionnaireService,
    private artifactsService: ArtifactsService,
    private companiesService: CompaniesService,
  ) {}

  @Post('questionnaire/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EMPLOYEE)
  createLink(@Param('id') questionnaireId: string, @Body() dto: CreateLinkDto) {
    return this.linksService.createLink(questionnaireId, dto.fillDays);
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

  // Скачивание файла подрядчиком без JWT: гарантийное письмо загружает
  // сотрудник/аудитор, а забирать его должен подрядчик по своей ссылке.
  @Get(':token/artifacts/:artifactId/download')
  async downloadArtifact(
    @Param('token') token: string,
    @Param('artifactId') artifactId: string,
    @Res() res: Response,
  ) {
    const link = await this.linksService.findByToken(token);
    const artifact = await this.artifactsService.getById(artifactId);

    if (artifact.questionnaireId !== link.questionnaireId) {
      throw new NotFoundException('Файл не найден!');
    }

    const filePath = join(UPLOAD_DIR, artifact.storedPath);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Файл не найден на диске!');
    }

    res.setHeader('Content-Type', artifact.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(artifact.fileName)}"`,
    );
    res.sendFile(filePath);
  }

  @Delete(':token/artifacts/:artifactId')
  async deleteArtifact(
    @Param('token') token: string,
    @Param('artifactId') artifactId: string,
  ) {
    const link = await this.linksService.findByToken(token); // проверяем что ссылка валидна
    const artifact = await this.artifactsService.getById(artifactId);

    if (artifact.questionnaireId !== link.questionnaireId) {
      throw new NotFoundException('Файл не найден!');
    }

    return this.artifactsService.remove(artifactId);
  }

  @Get(':token/employees')
  async getEmployees(@Param('token') token: string) {
    const link = await this.linksService.findByToken(token);
    return this.companiesService.getEmployees(link.questionnaire.companyId);
  }

  @Post(':token/select-employee')
  async selectEmployee(
    @Param('token') token: string,
    @Body('employeeId') employeeId: string,
  ) {
    const link = await this.linksService.findByToken(token);
    return this.questionnaireService.setFilledByEmployee(
      link.questionnaireId,
      employeeId,
    );
  }
}
