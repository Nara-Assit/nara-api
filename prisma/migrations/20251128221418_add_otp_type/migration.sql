/*
  Warnings:

  - Added the required column `type` to the `OtpCode` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- DropIndex
DROP INDEX "OtpCode_userId_idx";

-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN     "type" "OtpType" NOT NULL;

-- CreateIndex
CREATE INDEX "OtpCode_userId_type_idx" ON "OtpCode"("userId", "type");
