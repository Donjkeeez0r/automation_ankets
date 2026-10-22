import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma';
import { AuthUser } from '../auth/types';

// Проверки доступа к конкретной анкете (дополняют проверку роли в RolesGuard).
//
// Просматривать любую анкету могут обе роли. Изменять — только ответственный
// за скоринг, за которым она закреплена (employeeId). Удалять — он же или
// администратор.
@Injectable()
export class QuestionnaireAccessService {
  constructor(private prismaService: PrismaService) {}

  private async getOwnerId(questionnaireId: string) {
    const questionnaire = await this.prismaService.questionnaire.findUnique({
      where: { id: questionnaireId },
      select: { employeeId: true },
    });

    if (!questionnaire) {
      throw new NotFoundException('Анкета не найдена!');
    }

    return questionnaire.employeeId;
  }

  async assertCanEdit(questionnaireId: string, user: AuthUser) {
    const ownerId = await this.getOwnerId(questionnaireId);

    if (user.role !== Role.EMPLOYEE || ownerId !== user.userId) {
      throw new ForbiddenException(
        'Изменять анкету может только закреплённый за ней ответственный за скоринг!',
      );
    }
  }

  async assertCanDelete(questionnaireId: string, user: AuthUser) {
    const ownerId = await this.getOwnerId(questionnaireId);

    if (user.role === Role.ADMIN) {
      return;
    }

    if (ownerId !== user.userId) {
      throw new ForbiddenException(
        'Удалить анкету может только закреплённый за ней ответственный или администратор!',
      );
    }
  }

  // Для действий с файлом по его id: права определяются анкетой, к которой он прикреплён.
  async assertCanEditArtifact(artifactId: string, user: AuthUser) {
    const artifact = await this.prismaService.artifact.findUnique({
      where: { id: artifactId },
      select: { questionnaireId: true },
    });

    if (!artifact) {
      throw new NotFoundException('Файл не найден!');
    }

    await this.assertCanEdit(artifact.questionnaireId, user);
  }
}
