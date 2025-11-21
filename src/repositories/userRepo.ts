import prisma from "../db.js";

export const getAllUsers = async () => {
  return await prisma.user.findMany();
};

export const getUserById = async (id: number) => {
  return await prisma.user.findUnique({ where: { id } });
};

export const createUser = async (data: {
  fullName: string;
  email?: string;
  phoneNumber?: string;
  passwordHash: string;
  role: "DEAF" | "COCHLEAR" | "PARENT" | "SPECIALIST";
}) => {
  return await prisma.user.create({ data });
};
