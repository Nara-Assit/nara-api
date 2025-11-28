/*
  Warnings:

  - The values [COCHLEAR] on the enum `RoleType` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `age` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `closeContactNumber` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `country` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RoleType_new" AS ENUM ('DEAF', 'MUTE', 'COCHLEAR_IMPLANT', 'PARENT', 'SPECIALIST', 'DOCTOR');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "RoleType_new" USING ("role"::text::"RoleType_new");
ALTER TYPE "RoleType" RENAME TO "RoleType_old";
ALTER TYPE "RoleType_new" RENAME TO "RoleType";
DROP TYPE "public"."RoleType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "OtpCode" DROP CONSTRAINT "OtpCode_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "age" SMALLINT NOT NULL,
ADD COLUMN     "closeContactNumber" VARCHAR(15) NOT NULL,
ADD COLUMN     "country" VARCHAR(50) NOT NULL,
ALTER COLUMN "phoneNumber" SET DATA TYPE VARCHAR(15);

-- DropEnum
DROP TYPE "NotificationType";

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
