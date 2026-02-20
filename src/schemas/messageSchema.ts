import z from 'zod';

export const messageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Message content cannot be empty')
    .max(1000, 'Message content cannot exceed 1000 characters'),
});
