import type { Request, Response } from 'express';

export default function (req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
}
