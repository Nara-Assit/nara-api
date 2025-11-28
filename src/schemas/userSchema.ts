import type { User } from '@prisma/client';
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  phoneNumber: z.string().min(11).max(15).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['DEAF', 'COCHLEAR_IMPLANT', 'PARENT', 'SPECIALIST', 'DOCTOR', 'MUTE']),
  country: z.string().max(50),
  age: z.number().min(3).max(120),
  closeContactNumber: z.string().min(11).max(15),
});
export type RegisterUserBody = Pick<
  User,
  'name' | 'email' | 'phoneNumber' | 'role' | 'country' | 'age' | 'closeContactNumber'
> & {
  password: string;
};
export type CreateUserData = Omit<RegisterUserBody, 'password'> & { passwordHash: string };

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
