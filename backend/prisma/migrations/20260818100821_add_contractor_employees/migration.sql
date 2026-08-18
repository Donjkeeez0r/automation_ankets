-- AlterTable
ALTER TABLE "Questionnaire" ADD COLUMN     "filledByEmployeeId" TEXT;

-- CreateTable
CREATE TABLE "ContactorEmployee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "ContactorEmployee_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContactorEmployee" ADD CONSTRAINT "ContactorEmployee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_filledByEmployeeId_fkey" FOREIGN KEY ("filledByEmployeeId") REFERENCES "ContactorEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
