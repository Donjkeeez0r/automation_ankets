import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import 'multer';
import { randomBytes } from 'crypto';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class ArtifactsService {
  constructor(private prismaService: PrismaService) {}

  async saveFile(
    questionnaireId: string,
    file: Express.Multer.File,
    questionId?: string,
  ) {
    const fixedFileName = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const uniqueName = `${randomBytes(16).toString('hex')}-${file.originalname}`;
    const storedPath = join(UPLOAD_DIR, uniqueName);

    await writeFile(storedPath, file.buffer);

    return this.prismaService.artifact.create({
      data: {
        fileName: fixedFileName,
        storedPath: uniqueName,
        mimeType: file.mimetype,
        size: file.size,
        questionnaireId,
        questionId,
      },
    });
  }

  async getByQuestionnaire(questionnaireId: string) {
    return this.prismaService.artifact.findMany({
      where: { questionnaireId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getById(id: string) {
    const artifact = await this.prismaService.artifact.findUnique({
      where: { id },
    });

    if (!artifact) {
      throw new NotFoundException('Файл не найден!');
    }

    return artifact;
  }

  async remove(id: string) {
    const artifact = await this.getById(id);

    const filePath = join(UPLOAD_DIR, artifact.storedPath);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }

    await this.prismaService.artifact.delete({ where: { id } });

    return { message: 'Файл удалён' };
  }
}
