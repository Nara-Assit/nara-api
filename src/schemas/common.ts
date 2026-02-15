import { z } from 'zod';

export const UserIdSchema = z.coerce.number().int().positive('ID must be a positive integer');

export const IdParamSchema = z.object({
  targetUserId: UserIdSchema,
});
