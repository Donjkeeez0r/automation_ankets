/*
  Warnings:

  - You are about to drop the column `userId` on the `Questionnaire` table. All the data in the column will be lost.
  - Added the required column `contractorId` to the `Questionnaire` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employeeId` to the `Questionnaire` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Questionnaire" DROP CONSTRAINT "Questionnaire_userId_fkey";

-- AlterTable
ALTER TABLE "Questionnaire" DROP COLUMN "userId",
ADD COLUMN     "contractorId" TEXT NOT NULL,
ADD COLUMN     "employeeId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
