import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma';

type FakeUser = { id: string; name: string; email: string; role: Role };

function createService(opts: {
  users: FakeUser[];
  questionnaireCount?: number;
}) {
  const users = new Map(opts.users.map((u) => [u.id, u]));
  const prisma = {
    user: {
      findUnique: jest.fn(({ where }: { where: { id?: string } }) =>
        Promise.resolve(where.id ? (users.get(where.id) ?? null) : null),
      ),
      count: jest.fn(({ where }: { where: { role: Role } }) =>
        Promise.resolve(opts.users.filter((u) => u.role === where.role).length),
      ),
      delete: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    questionnaire: {
      count: jest.fn().mockResolvedValue(opts.questionnaireCount ?? 0),
      findMany: jest.fn().mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    activityLog: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    $transaction: jest.fn(),
  };
  // Интерактивная транзакция: колбэк получает тот же клиент
  prisma.$transaction.mockImplementation(
    (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
  );
  const service = new UsersService(prisma as unknown as PrismaService);
  return { service, prisma };
}

const admin1: FakeUser = {
  id: 'a1',
  name: 'Админ 1',
  email: 'a1@x.ru',
  role: Role.ADMIN,
};
const admin2: FakeUser = {
  id: 'a2',
  name: 'Админ 2',
  email: 'a2@x.ru',
  role: Role.ADMIN,
};
const emp1: FakeUser = {
  id: 'e1',
  name: 'Сотрудник 1',
  email: 'e1@x.ru',
  role: Role.EMPLOYEE,
};
const emp2: FakeUser = {
  id: 'e2',
  name: 'Сотрудник 2',
  email: 'e2@x.ru',
  role: Role.EMPLOYEE,
};

describe('UsersService — защиты управления пользователями', () => {
  it('нельзя удалить себя', async () => {
    const { service, prisma } = createService({ users: [admin1, admin2] });
    await expect(service.remove('a1', 'a1')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('нельзя удалить пользователя с закреплёнными анкетами', async () => {
    const { service, prisma } = createService({
      users: [admin1, emp1],
      questionnaireCount: 3,
    });
    await expect(service.remove('e1', 'a1')).rejects.toThrow(/анкет: 3/);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('удаляет пользователя без анкет', async () => {
    const { service, prisma } = createService({ users: [admin1, emp1] });
    await service.remove('e1', 'a1');
    expect(prisma.user.delete).toHaveBeenCalled();
  });

  it('удаляет второго администратора, если он не последний', async () => {
    const { service, prisma } = createService({ users: [admin1, admin2] });
    await service.remove('a2', 'a1');
    expect(prisma.user.delete).toHaveBeenCalled();
  });

  it('нельзя изменить собственную роль', async () => {
    const { service, prisma } = createService({ users: [admin1, admin2] });
    await expect(
      service.update('a1', { role: Role.EMPLOYEE }, 'a1'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('нельзя сделать администратором сотрудника с анкетами', async () => {
    const { service, prisma } = createService({
      users: [admin1, emp1],
      questionnaireCount: 1,
    });
    await expect(
      service.update('e1', { role: Role.ADMIN }, 'a1'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('передаёт анкеты только ответственному за скоринг', async () => {
    const { service } = createService({ users: [admin1, emp1] });
    await expect(service.transferQuestionnaires('e1', 'a1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('передаёт анкеты и пишет событие в историю каждой', async () => {
    const { service, prisma } = createService({
      users: [admin1, emp1, emp2],
    });
    const result = await service.transferQuestionnaires('e1', 'e2');
    expect(result).toEqual({ transferred: 2 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.questionnaire.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['q1', 'q2'] }, employeeId: 'e1' },
      data: { employeeId: 'e2' },
    });
    const logs = prisma.activityLog.createMany.mock.calls[0][0] as {
      data: { questionnaireId: string; type: string }[];
    };
    expect(logs.data.map((d) => d.questionnaireId)).toEqual(['q1', 'q2']);
    expect(logs.data.every((d) => d.type === 'OWNER_CHANGED')).toBe(true);
  });
});
