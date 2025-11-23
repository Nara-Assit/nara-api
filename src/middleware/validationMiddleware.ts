import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export default function validateData(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return res.status(400).json({ errors });
    }
    next();
  };
}
