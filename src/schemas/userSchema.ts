import type { User } from '@prisma/client';
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  phoneNumber: z.string().trim().min(11).max(15).optional(),
  password: z.string().trim().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['DEAF', 'COCHLEAR_IMPLANT', 'PARENT', 'SPECIALIST', 'DOCTOR', 'MUTE']),
  country: z.string().trim().max(50),
  age: z.number().min(3).max(120),
  closeContactNumber: z.string().trim().min(11).max(15),
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
  password: z.string().trim().min(6, 'Password must be at least 6 characters'),
});
export type LoginUserBody = Pick<User, 'email'> & {
  password: string;
};

export const verifyOtpSchema = z.object({
  otpCode: z.string().trim(),
  email: z.email('Invalid email'),
});
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;

export const forgotPasswordSchema = z.object({ email: z.email('Invalid email') });
export type forgotPasswordBody = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().trim().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().trim().min(6, 'Confirm Password must be at least 6 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });
export type resetPasswordBody = z.infer<typeof resetPasswordSchema>;
