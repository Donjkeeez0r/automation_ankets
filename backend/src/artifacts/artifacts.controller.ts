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

const UPLOAD_DIR = join(process.cwd(), 'uploads');

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('artifacts')
export class ArtifactsController {
  constructor(private artifactsService: ArtifactsService) {}

  @Post('questionnaire/:questionnaireId')
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @Param('questionnaireId') questionnaireId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('questionId') questionId?: string,
  ) {
    return this.artifactsService.saveFile(questionnaireId, file, questionId);
  }

  @Get('questionnaire/:questionnaireId')
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  getByQuestionnaire(@Param('questionnaireId') questionnaireId: string) {
    return this.artifactsService.getByQuestionnaire(questionnaireId);
  }

  @Get(':id/download')
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
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
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  remove(@Param('id') id: string) {
    return this.artifactsService.remove(id);
  }

  @Post('questionnaire/:questionnaireId/guarantee-letter')
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  @UseInterceptors(FileInterceptor('file'))
  uploadGuaranteeLetter(
    @Param('questionnaireId') questionnaireId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.artifactsService.saveFile(
      questionnaireId,
      file,
      undefined,
      'guarantee_letter',
    );
  }
}
