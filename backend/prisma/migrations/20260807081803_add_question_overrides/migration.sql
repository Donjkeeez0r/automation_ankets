-- CreateTable
CREATE TABLE "QuestionOverride" (
    "id" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "QuestionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionOverride_questionnaireId_questionId_key" ON "QuestionOverride"("questionnaireId", "questionId");

-- AddForeignKey
ALTER TABLE "QuestionOverride" ADD CONSTRAINT "QuestionOverride_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOverride" ADD CONSTRAINT "QuestionOverride_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
