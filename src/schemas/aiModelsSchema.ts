import z from 'zod';

export const ttsSchema = z.object({
  text: z.string().trim().min(1, 'text cannot be empty'),
});
