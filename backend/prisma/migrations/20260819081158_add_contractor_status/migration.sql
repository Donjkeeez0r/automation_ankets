-- CreateEnum
CREATE TYPE "ContactorStatus" AS ENUM ('GREEN', 'YELLOW', 'RED', 'NONE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "status" "ContactorStatus" NOT NULL DEFAULT 'NONE';
