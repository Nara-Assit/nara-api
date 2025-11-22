import type { User } from '@prisma/client';
import prisma from '../db.js';
import type { RegisterUserBody } from '../schemas/userSchema.js';

export const getUserById = async (id: number) => {
  return await prisma.user.findUnique({ where: { id } });
};

export const getUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({ where: { email } });
};

export const createUser = async (data: {
  name: string;
  email: string;
  phoneNumber?: string | null;
  passwordHash: string;
  role: RegisterUserBody['role'];
}) => {
  return await prisma.user.create({ data });
};

export const updateUser = async (id: number, data: Partial<User>) => {
  return await prisma.user.update({ where: { id }, data });
};
