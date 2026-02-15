import { z } from 'zod';
import { UserIdSchema } from './common.js';

export const CreateChatSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PRIVATE'),
    targetUserId: UserIdSchema, // The person you are chatting with
  }),

  z.object({
    type: z.literal('GROUP'),
    name: z.string().min(1, 'Group name is required').max(100),
    description: z.string().max(500).optional(),
    avatarUrl: z.string().optional(),

    members: z
      .array(UserIdSchema)
      .min(1, 'Group must have at least 1 other member')
      .refine((items) => new Set(items).size === items.length, {
        message: 'Member list must not contain duplicates',
      }),
  }),
]);

export type CreateChatInput = z.infer<typeof CreateChatSchema>;

export const UpdateChatSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Group name cannot be empty')
      .max(50, 'Group name must be 50 characters or less')
      .optional(),

    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .nullable()
      .optional(),

    avatarUrl: z.string().max(255).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateChatInput = z.infer<typeof UpdateChatSchema>;
