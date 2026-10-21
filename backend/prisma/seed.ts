import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../src/generated/prisma';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import questions from './seed-data/questions.json';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Первый администратор создаётся из ADMIN_EMAIL / ADMIN_PASSWORD, только если
// в базе ещё нет ни одного ADMIN. Остальных пользователей создаёт Админ через POST /users.
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      'ADMIN_EMAIL / ADMIN_PASSWORD не заданы — создание первого администратора пропущено.',
    );
    return;
  }

  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  if (adminCount > 0) {
    console.log('Администратор уже существует — пропускаем.');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.warn(
      `Пользователь ${email} уже существует с ролью ${existing.role} — администратор не создан.`,
    );
    return;
  }

  // Так же, как в UsersService: bcrypt, 10 раундов
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Администратор',
      organization: '',
      role: Role.ADMIN,
    },
  });

  console.log(`Создан первый администратор: ${email}`);
}

async function main() {
  for (const question of questions) {
    await prisma.question.upsert({
      where: { code: question.code },
      update: question,
      create: question,
    });
  }

  console.log(`Загружено вопросов: ${questions.length}`);

  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
