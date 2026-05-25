import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
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

  const tokens = generateTokens(user.id, user.role, user.displayName);

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
    // 刷新令牌被盗用，删除该用户所有会话
    await prisma.session.deleteMany({ where: { userId: payload.userId } });
    throw new AppError(401, '刷新令牌已失效，请重新登录');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new AppError(401, '用户不存在');
  }

  // 删除旧会话，生成新 token
  await prisma.session.delete({ where: { id: session.id } });
  const tokens = generateTokens(user.id, user.role, user.displayName);

  // 创建新会话
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      deviceInfo: session.deviceInfo,
    },
  });

  return tokens;
}

export async function logout(refreshToken: string) {
  await prisma.session.deleteMany({ where: { refreshToken } });
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
