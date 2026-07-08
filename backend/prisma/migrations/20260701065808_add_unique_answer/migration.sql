/*
  Warnings:

  - A unique constraint covering the columns `[questionnaireId,questionId]` on the table `Answer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Answer_questionnaireId_questionId_key" ON "Answer"("questionnaireId", "questionId");
