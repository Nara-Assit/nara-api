/*
  Warnings:

  - You are about to drop the column `message` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `data` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'CHAT', 'SESSION', 'TRAINING');

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "message",
DROP COLUMN "title",
ADD COLUMN     "data" JSONB NOT NULL,
ADD COLUMN     "type" "NotificationType" NOT NULL;
