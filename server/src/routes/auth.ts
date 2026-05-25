import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema } from '../types/schemas';
import * as authService from '../services/auth.service';
import { Role } from '../types/enums';

const router = Router();

// POST /api/v1/auth/register
router.post(
  '/register',
  authenticate,
  requireRole('admin'),
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.register(req.body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/login
router.post(
  '/login',
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password, remember } = req.body;
      const deviceInfo = req.headers['user-agent'] || 'unknown';
      const result = await authService.login(username, password, remember, deviceInfo);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: '缺少刷新令牌' });
      return;
    }
    const tokens = await authService.refreshAccessToken(refreshToken);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.json({ message: '已退出登录' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/profile
router.get('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await authService.getProfile(req.userId!);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/auth/password
router.put(
  '/password',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body;
      await authService.changePassword(req.userId!, oldPassword, newPassword);
      res.json({ message: '密码修改成功，请重新登录' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
