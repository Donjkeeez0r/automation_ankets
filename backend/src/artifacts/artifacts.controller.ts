import {
  Body,
  Post,
  Controller,
  Param,
  UploadedFile,
  UseInterceptors,
  Get,
  Delete,
  NotFoundException,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ArtifactsService } from './artifacts.service';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { QuestionnaireAccessService } from '../access/questionnaire-access.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Скачивать файлы анкеты могут обе роли; загружать и удалять — только
// закреплённый за анкетой ответственный за скоринг.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('artifacts')
export class ArtifactsController {
  constructor(
    private artifactsService: ArtifactsService,
    private access: QuestionnaireAccessService,
  ) {}

  @Post('questionnaire/:questionnaireId')
  @Roles(Role.EMPLOYEE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser() user: AuthUser,
    @Param('questionnaireId') questionnaireId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('questionId') questionId?: string,
  ) {
    await this.access.assertCanEdit(questionnaireId, user);
    return this.artifactsService.saveFile(questionnaireId, file, questionId);
  }

  @Get('questionnaire/:questionnaireId')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  getByQuestionnaire(@Param('questionnaireId') questionnaireId: string) {
    return this.artifactsService.getByQuestionnaire(questionnaireId);
  }

  @Get(':id/download')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  async download(@Param('id') id: string, @Res() res: Response) {
    const artifact = await this.artifactsService.getById(id);
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

  @Delete(':id')
  @Roles(Role.EMPLOYEE)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.access.assertCanEditArtifact(id, user);
    return this.artifactsService.remove(id);
  }

  @Post('questionnaire/:questionnaireId/guarantee-letter')
  @Roles(Role.EMPLOYEE)
  @UseInterceptors(FileInterceptor('file'))
  async uploadGuaranteeLetter(
    @CurrentUser() user: AuthUser,
    @Param('questionnaireId') questionnaireId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.access.assertCanEdit(questionnaireId, user);
    return this.artifactsService.saveFile(
      questionnaireId,
      file,
      undefined,
      'guarantee_letter',
    );
  }
}
