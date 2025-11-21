-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('DEAF', 'COCHLEAR', 'PARENT', 'SPECIALIST');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullName" VARCHAR(50) NOT NULL,
    "profileImageUrl" VARCHAR(255),
    "email" VARCHAR(255),
    "phoneNumber" VARCHAR(15),
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "RoleType" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");
