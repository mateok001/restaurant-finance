import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(`[ERROR] ${err.name}: ${err.message}`);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    res.status(400).json({ error: '输入数据验证失败', details: messages });
    return;
  }

  // Prisma known errors
  if (err.constructor?.name === 'PrismaClientKnownRequestError') {
    const code = (err as any).code;
    if (code === 'P2002') {
      res.status(409).json({ error: '数据已存在，请检查重复字段' });
      return;
    }
    if (code === 'P2025') {
      res.status(404).json({ error: '记录不存在' });
      return;
    }
  }

  res.status(500).json({ error: '服务器内部错误' });
}
