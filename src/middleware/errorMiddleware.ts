import type { Request, Response } from 'express';

const errorMiddleware = (err: Error, req: Request, res: Response) => {
  console.error(err.stack);

  const statusCode = 500;
  const error = 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    message: error,
  });
};

export default errorMiddleware;
