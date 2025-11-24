import type { User } from '@prisma/client';
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  phoneNumber: z.string().length(11, 'Phone number must be 11 digits').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['DEAF', 'COCHLEAR', 'PARENT', 'SPECIALIST']),
});
export type RegisterUserBody = Pick<User, 'name' | 'email' | 'phoneNumber' | 'role'> & {
  password: string;
};

export const loginUserSchema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginUserBody = Pick<User, 'email'> & {
  password: string;
};

export const verifyUserSchema = z.object({
  otpCode: z.string(),
  email: z.email('Invalid email'),
});
export type VerifyUserBody = z.infer<typeof verifyUserSchema>;
