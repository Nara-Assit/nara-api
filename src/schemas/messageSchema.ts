import z from 'zod';

export const messageSchema = z.object({
  text: z.string().trim().min(1, 'Message content cannot be empty'),
});
