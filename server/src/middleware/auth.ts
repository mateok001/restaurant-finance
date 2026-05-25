import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Role } from '../types/enums';

interface JwtPayload {
  userId: string;
  role: Role;
  displayName: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
    req.userId = payload.userId;
    req.userRole = payload.role;
    req.userDisplayName = payload.displayName;
    next();
  } catch {
    res.status(401).json({ error: '认证令牌无效或已过期' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: '无权执行此操作' });
      return;
    }
    next();
  };
}

export function requireAdminOrPartner(req: Request, res: Response, next: NextFunction): void {
  if (!req.userRole || (req.userRole !== 'admin' && req.userRole !== 'partner')) {
    res.status(403).json({ error: '仅管理员和合伙人可执行此操作' });
    return;
  }
  next();
}
