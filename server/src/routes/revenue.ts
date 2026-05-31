import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdminOrPartner } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { revenueChannelSchema, dailyRevenueSchema, dailyRevenueUpdateSchema } from '../types/schemas';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// ========== 收入渠道 ==========

router.get('/revenue-channels', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const channels = await prisma.revenueChannel.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json(channels);
  } catch (err) { next(err); }
});

router.post('/revenue-channels', requireAdminOrPartner, validate(revenueChannelSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channel = await prisma.revenueChannel.create({ data: req.body });
    res.status(201).json(channel);
  } catch (err) { next(err); }
});

router.put('/revenue-channels/:id', requireAdminOrPartner, validate(revenueChannelSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const channel = await prisma.revenueChannel.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(channel);
  } catch (err) { next(err); }
});

router.delete('/revenue-channels/:id', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const revenues = await prisma.dailyRevenue.count({ where: { channelId: req.params.id } });
    if (revenues > 0) {
      res.status(400).json({ error: '该渠道存在收入记录，无法删除' });
      return;
    }
    const channel = await prisma.revenueChannel.findUnique({ where: { id: req.params.id } });
    if (channel?.isDefault) {
      res.status(400).json({ error: '默认渠道不可删除' });
      return;
    }
    await prisma.revenueChannel.delete({ where: { id: req.params.id } });
    res.json({ message: '删除成功' });
  } catch (err) { next(err); }
});

// ========== 每日收入 ==========

router.get('/daily-revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 31;
    const where: any = {};

    if (req.query.channelId) where.channelId = req.query.channelId;
    if (req.query.startDate || req.query.endDate) {
      where.revenueDate = {};
      if (req.query.startDate) where.revenueDate.gte = new Date(`${req.query.startDate}T00:00:00+08:00`);
      if (req.query.endDate) where.revenueDate.lte = new Date(`${req.query.endDate}T23:59:59+08:00`);
    }

    const [items, total] = await Promise.all([
      prisma.dailyRevenue.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          channel: { select: { id: true, name: true } },
          recorder: { select: { id: true, displayName: true } },
        },
        orderBy: { revenueDate: 'desc' },
      }),
      prisma.dailyRevenue.count({ where }),
    ]);
    res.json({ items, total, page, pageSize });
  } catch (err) { next(err); }
});

router.post('/daily-revenue', requireAdminOrPartner, validate(dailyRevenueSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const revenue = await prisma.dailyRevenue.create({
      data: {
        ...req.body,
        revenueDate: new Date(req.body.revenueDate),
        recordedBy: req.userId!,
      },
    });
    res.status(201).json(revenue);
  } catch (err) { next(err); }
});

router.put('/daily-revenue/:id', requireAdminOrPartner, validate(dailyRevenueUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.dailyRevenue.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: '收入记录不存在' });
      return;
    }
    // 仅允许更新白名单字段，防止覆盖 recordedBy 等敏感字段
    const { channelId, amount, revenueDate, memo } = req.body;
    const updateData: any = {};
    if (channelId !== undefined) updateData.channelId = channelId;
    if (amount !== undefined) updateData.amount = amount;
    if (revenueDate !== undefined) updateData.revenueDate = new Date(revenueDate);
    if (memo !== undefined) updateData.memo = memo;
    const revenue = await prisma.dailyRevenue.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(revenue);
  } catch (err) { next(err); }
});

router.delete('/daily-revenue/:id', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.dailyRevenue.delete({ where: { id: req.params.id } });
    res.json({ message: '删除成功' });
  } catch (err) { next(err); }
});

export default router;
