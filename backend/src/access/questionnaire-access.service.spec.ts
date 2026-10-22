import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuestionnaireAccessService } from './questionnaire-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma';
import { AuthUser } from '../auth/types';

const owner: AuthUser = {
  userId: 'owner',
  email: 'o@x.ru',
  role: Role.EMPLOYEE,
};
const otherEmployee: AuthUser = {
  userId: 'other',
  email: 'e@x.ru',
  role: Role.EMPLOYEE,
};
const admin: AuthUser = { userId: 'admin', email: 'a@x.ru', role: Role.ADMIN };

function createService(questionnaire: { employeeId: string } | null) {
  const prisma = {
    questionnaire: { findUnique: jest.fn().mockResolvedValue(questionnaire) },
    artifact: {
      findUnique: jest.fn().mockResolvedValue({ questionnaireId: 'q1' }),
    },
  };
  return new QuestionnaireAccessService(prisma as unknown as PrismaService);
}

describe('QuestionnaireAccessService', () => {
  describe('assertCanEdit', () => {
    it('пускает закреплённого ответственного', async () => {
      const service = createService({ employeeId: 'owner' });
      await expect(service.assertCanEdit('q1', owner)).resolves.toBeUndefined();
    });

    it('запрещает другому ответственному', async () => {
      const service = createService({ employeeId: 'owner' });
      await expect(service.assertCanEdit('q1', otherEmployee)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('запрещает администратору', async () => {
      const service = createService({ employeeId: 'owner' });
      await expect(service.assertCanEdit('q1', admin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('404, если анкеты нет', async () => {
      const service = createService(null);
      await expect(service.assertCanEdit('q1', owner)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assertCanDelete', () => {
    it('пускает закреплённого ответственного', async () => {
      const service = createService({ employeeId: 'owner' });
      await expect(
        service.assertCanDelete('q1', owner),
      ).resolves.toBeUndefined();
    });

    it('пускает администратора', async () => {
      const service = createService({ employeeId: 'owner' });
      await expect(
        service.assertCanDelete('q1', admin),
      ).resolves.toBeUndefined();
    });

    it('запрещает другому ответственному', async () => {
      const service = createService({ employeeId: 'owner' });
      await expect(
        service.assertCanDelete('q1', otherEmployee),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertCanEditArtifact', () => {
    it('проверяет права по анкете, к которой прикреплён файл', async () => {
      const service = createService({ employeeId: 'owner' });
      await expect(
        service.assertCanEditArtifact('a1', owner),
      ).resolves.toBeUndefined();
      await expect(
        service.assertCanEditArtifact('a1', otherEmployee),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
