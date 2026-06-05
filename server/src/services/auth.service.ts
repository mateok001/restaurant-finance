import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { Role } from '../types/enums';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function generateTokens(userId: string, role: Role, displayName: string): TokenPair {
  const accessToken = jwt.sign(
    { userId, role, displayName },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpires as any },
  );

  const refreshToken = jwt.sign(
    { userId, tokenId: uuidv4() },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpires as any },
  );

  const accessExpiresMs =
    config.jwt.accessExpires === '2h' ? 2 * 60 * 60 * 1000 : 30 * 60 * 1000;

  return {
    accessToken,
    refreshToken,
    expiresIn: accessExpiresMs,
  };
}

export async function register(data: {
  username: string;
  password: string;
  displayName: string;
  role: Role;
}) {
  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) {
    throw new AppError(409, '用户名已存在');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      username: data.username,
      passwordHash,
      displayName: data.displayName,
      role: data.role,
    },
  });

  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role };
}

export async function login(
  username: string,
  password: string,
  remember: boolean,
  deviceInfo?: string,
) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    throw new AppError(401, '用户名或密码错误');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, '用户名或密码错误');
  }

  const tokens = generateTokens(user.id, user.role as Role, user.displayName);

  // 保存 refresh token 到数据库
  const expiresAt = remember
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt,
      deviceInfo: deviceInfo || 'unknown',
    },
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    ...tokens,
  };
}

export async function refreshAccessToken(oldRefreshToken: string) {
  let payload: any;
  try {
    payload = jwt.verify(oldRefreshToken, config.jwt.refreshSecret);
  } catch {
    throw new AppError(401, '刷新令牌无效或已过期');
  }

  const session = await prisma.session.findFirst({
    where: { refreshToken: oldRefreshToken, expiresAt: { gt: new Date() } },
  });

  if (!session) {
    // 刷新令牌被盗用或已过期，删除该用户所有会话
    await prisma.session.deleteMany({ where: { userId: payload.userId } });
    throw new AppError(401, '刷新令牌已失效，请重新登录');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new AppError(401, '用户不存在');
  }

  const tokens = generateTokens(user.id, user.role as Role, user.displayName);

  // 在事务中原子地替换 session，避免竞态条件
  // 使用 deleteMany 而非 delete 避免 P2025 错误（并发刷新）
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const deleted = await tx.session.deleteMany({
      where: { id: session.id, refreshToken: oldRefreshToken },
    });
    if (deleted.count === 0) {
      // 会话已被其他请求删除（token 可能被盗用）
      await tx.session.deleteMany({ where: { userId: user.id } });
      throw new AppError(401, '刷新令牌已失效，请重新登录');
    }
    // 创建新会话，保留原始 remember 设置（根据原会话过期时间推断）
    const originalDuration = session.expiresAt.getTime() - session.createdAt.getTime();
    const expiresAt = new Date(Date.now() + originalDuration);
    await tx.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt,
        deviceInfo: session.deviceInfo,
      },
    });
  });

  return tokens;
}

export async function logout(refreshToken: string) {
  await prisma.session.deleteMany({ where: { refreshToken } });
}

// 清理过期会话（建议通过定时任务调用）
export async function cleanupExpiredSessions() {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError(404, '用户不存在');
  return user;
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, '用户不存在');

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) throw new AppError(400, '原密码错误');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // 清除所有会话，强制重新登录
  await prisma.session.deleteMany({ where: { userId } });
}

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, '用户不存在');
  if (user.role === 'admin') {
    // 检查是否是最后一个 admin
    const adminCount = await prisma.user.count({ where: { role: 'admin' } });
    if (adminCount <= 1) {
      throw new AppError(400, '不能删除最后一个管理员账户');
    }
  }
  // 清除用户会话
  await prisma.session.deleteMany({ where: { userId } });
  // 删除用户
  await prisma.user.delete({ where: { id: userId } });
}
