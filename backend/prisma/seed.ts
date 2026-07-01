import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import { Pool } from 'pg';
import questions from './seed-data/questions.json';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const question of questions) {
    await prisma.question.upsert({
      where: { code: question.code },
      update: {},
      create: question,
    });
  }

  console.log(`Загружено вопросов: ${questions.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
