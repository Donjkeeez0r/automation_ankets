-- CreateTable
CREATE TABLE "QuestionnaireLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionnaireId" TEXT NOT NULL,

    CONSTRAINT "QuestionnaireLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireLink_token_key" ON "QuestionnaireLink"("token");

-- AddForeignKey
ALTER TABLE "QuestionnaireLink" ADD CONSTRAINT "QuestionnaireLink_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
