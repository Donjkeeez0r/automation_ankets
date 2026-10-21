-- CreateEnum
CREATE TYPE "QuestionnaireType" AS ENUM ('SECURITY', 'MATURITY');

-- AlterTable
ALTER TABLE "Questionnaire" ADD COLUMN     "targetLevel" INTEGER,
ADD COLUMN     "type" "QuestionnaireType" NOT NULL DEFAULT 'SECURITY';

-- CreateTable
CREATE TABLE "MaturityItem" (
    "id" TEXT NOT NULL,
    "direction" INTEGER NOT NULL,
    "notApplicable" BOOLEAN NOT NULL DEFAULT false,
    "documentation" DOUBLE PRECISION,
    "execution" DOUBLE PRECISION,
    "tools" DOUBLE PRECISION,
    "qualification" DOUBLE PRECISION,
    "control" DOUBLE PRECISION,
    "training" DOUBLE PRECISION,
    "externalAudit" DOUBLE PRECISION,
    "improvement" DOUBLE PRECISION,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionnaireId" TEXT NOT NULL,

    CONSTRAINT "MaturityItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaturityItem_questionnaireId_direction_key" ON "MaturityItem"("questionnaireId", "direction");

-- AddForeignKey
ALTER TABLE "MaturityItem" ADD CONSTRAINT "MaturityItem_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
