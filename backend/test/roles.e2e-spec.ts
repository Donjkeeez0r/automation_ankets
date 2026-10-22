import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';

// Проверка ролевой модели на уровне HTTP: настоящие контроллеры, guard'ы и
// проверки владельца анкеты, но вместо БД — заглушка Prisma.
// Анкета q1 закреплена за emp1; emp2 — другой ответственный; admin — администратор.

process.env.JWT_SECRET ??= 'test-secret';
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

type Row = Record<string, unknown>;

const users: Record<string, Row> = {
  admin: { id: 'admin', email: 'admin@x.ru', name: 'Админ', role: 'ADMIN' },
  emp1: {
    id: 'emp1',
    email: 'emp1@x.ru',
    name: 'Сотрудник 1',
    role: 'EMPLOYEE',
  },
  emp2: {
    id: 'emp2',
    email: 'emp2@x.ru',
    name: 'Сотрудник 2',
    role: 'EMPLOYEE',
  },
};

const questionnaire = {
  id: 'q1',
  employeeId: 'emp1',
  status: 'SUBMITTED',
  type: 'SECURITY',
  company: { name: 'ООО Тест', contactName: 'Иван', contactEmails: [] },
  employee: users.emp1,
};

// Модель Prisma: заданные методы + любые другие, возвращающие пустой объект
const model = (methods: Record<string, (args: any) => unknown>) =>
  new Proxy(methods, {
    get: (target, prop: string) => target[prop] ?? (() => Promise.resolve({})),
  });

const fakePrisma = new Proxy(
  {
    user: model({
      findUnique: ({ where }) => Promise.resolve(users[where.id] ?? null),
      count: ({ where }) =>
        Promise.resolve(
          Object.values(users).filter((u) => u.role === where?.role).length,
        ),
    }),
    questionnaire: model({
      findUnique: ({ where }) =>
        Promise.resolve(where.id === 'q1' ? questionnaire : null),
      findMany: () => Promise.resolve([]),
      count: () => Promise.resolve(0),
    }),
    artifact: model({
      findUnique: ({ where }) =>
        Promise.resolve(
          where.id === 'a1' ? { id: 'a1', questionnaireId: 'q1' } : null,
        ),
    }),
    question: model({ findUnique: () => Promise.resolve(null) }),
  },
  {
    get: (target, prop: string) =>
      prop === 'then' ? undefined : (target[prop] ?? model({})),
  },
);

describe('Ролевая модель (e2e)', () => {
  let app: INestApplication<App>;
  let token: Record<'admin' | 'emp1' | 'emp2', string>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fakePrisma)
      .overrideProvider(NotificationsService)
      .useValue({ sendMail: () => Promise.resolve() })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    const jwt = app.get(JwtService);
    token = {
      admin: jwt.sign({ sub: 'admin' }),
      emp1: jwt.sign({ sub: 'emp1' }),
      emp2: jwt.sign({ sub: 'emp2' }),
    };
  });

  afterAll(async () => {
    await app.close();
  });

  const as = (who: keyof typeof token) => ({
    Authorization: `Bearer ${token[who]}`,
  });
  const http = () => request(app.getHttpServer());

  describe('просмотр анкет — обе роли', () => {
    it.each(['admin', 'emp1', 'emp2'] as const)('%s видит список', (who) =>
      http().get('/questionnaire').set(as(who)).expect(200),
    );
  });

  describe('изменение анкеты — только закреплённый ответственный', () => {
    const body = { status: 'APPROVED' };

    it('emp1 (владелец) меняет статус', () =>
      http()
        .patch('/questionnaire/q1/status')
        .set(as('emp1'))
        .send(body)
        .expect(200));

    it('emp2 не может менять статус чужой анкеты', () =>
      http()
        .patch('/questionnaire/q1/status')
        .set(as('emp2'))
        .send(body)
        .expect(403));

    it('admin не может менять статус', () =>
      http()
        .patch('/questionnaire/q1/status')
        .set(as('admin'))
        .send(body)
        .expect(403));

    it('emp2 не может выдать ссылку на чужую анкету', () =>
      http()
        .post('/links/questionnaire/q1')
        .set(as('emp2'))
        .send({})
        .expect(403));

    it('emp2 не может менять обязательность вопросов в чужой анкете', () =>
      http()
        .patch('/questionnaire/q1/question-overrides')
        .set(as('emp2'))
        .send({ overrides: [] })
        .expect(403));

    it('emp2 не может удалить файл чужой анкеты', () =>
      http().delete('/artifacts/a1').set(as('emp2')).expect(403));

    it('emp2 не может отправить рекомендации по чужой анкете', () =>
      http()
        .post('/questionnaire/q1/send-recommendations')
        .set(as('emp2'))
        .expect(403));

    it('emp2 не может пересчитать скоринг чужой анкеты', () =>
      http().post('/questionnaire/q1/recalculate').set(as('emp2')).expect(403));

    it('emp2 не может менять оценку зрелости чужой анкеты', () =>
      http()
        .patch('/questionnaire/q1/maturity')
        .set(as('emp2'))
        .send({ items: [{ direction: 1, notApplicable: true }] })
        .expect(403));

    it('emp2 не может менять целевой уровень чужой анкеты', () =>
      http()
        .patch('/questionnaire/q1/maturity/target-level')
        .set(as('emp2'))
        .send({ targetLevel: 2 })
        .expect(403));

    it('emp2 не может загрузить гарантийное письмо в чужую анкету', () =>
      http()
        .post('/artifacts/questionnaire/q1/guarantee-letter')
        .set(as('emp2'))
        .attach('file', Buffer.from('test'), 'letter.pdf')
        .expect(403));
  });

  describe('удаление анкеты — владелец или admin', () => {
    it('emp2 не может удалить чужую анкету', () =>
      http().delete('/questionnaire/q1').set(as('emp2')).expect(403));

    it('admin удаляет анкету', () =>
      http().delete('/questionnaire/q1').set(as('admin')).expect(200));

    it('emp1 удаляет свою анкету', () =>
      http().delete('/questionnaire/q1').set(as('emp1')).expect(200));
  });

  describe('передача анкеты — только admin', () => {
    it('emp1 не может передать все анкеты сотрудника', () =>
      http()
        .post('/users/emp1/transfer-questionnaires')
        .set(as('emp1'))
        .send({ toUserId: 'emp2' })
        .expect(403));

    it('emp1 не может передать анкету', () =>
      http()
        .patch('/questionnaire/q1/owner')
        .set(as('emp1'))
        .send({ employeeId: 'emp2' })
        .expect(403));

    it('admin передаёт анкету другому ответственному', () =>
      http()
        .patch('/questionnaire/q1/owner')
        .set(as('admin'))
        .send({ employeeId: 'emp2' })
        .expect(200));

    it('admin не может закрепить анкету за администратором', () =>
      http()
        .patch('/questionnaire/q1/owner')
        .set(as('admin'))
        .send({ employeeId: 'admin' })
        .expect(400));
  });

  describe('банк вопросов — только admin', () => {
    const question = {
      code: '9.9.9',
      section: 'general_info',
      text: 'Тест',
      type: 'yesno',
      order: 1,
    };

    it('emp1 не может добавить вопрос', () =>
      http()
        .post('/questionnaire/questions')
        .set(as('emp1'))
        .send(question)
        .expect(403));

    it('emp1 не может изменить вопрос', () =>
      http()
        .patch('/questionnaire/questions/x')
        .set(as('emp1'))
        .send({ required: false })
        .expect(403));

    it('банк вопросов виден без авторизации (нужен подрядчику)', () =>
      http().get('/questionnaire/questions').expect(200));
  });

  describe('компании', () => {
    it.each(['admin', 'emp1'] as const)('%s видит компании', (who) =>
      http().get('/companies').set(as(who)).expect(200),
    );

    it('emp1 не может удалить компанию', () =>
      http().delete('/companies/c1').set(as('emp1')).expect(403));

    it('admin удаляет компанию', () =>
      http().delete('/companies/c1').set(as('admin')).expect(200));
  });

  describe('пользователи — только admin', () => {
    it('emp1 не видит список пользователей', () =>
      http().get('/users').set(as('emp1')).expect(403));

    it('admin не может удалить себя', () =>
      http().delete('/users/admin').set(as('admin')).expect(400));

    it('admin не может изменить свою роль', () =>
      http()
        .patch('/users/admin')
        .set(as('admin'))
        .send({ role: 'EMPLOYEE' })
        .expect(400));

    it('без токена — 401', () => http().get('/questionnaire').expect(401));
  });
});
