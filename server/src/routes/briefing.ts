import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdminOrPartner } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { briefingGenerateSchema } from '../types/schemas';
import * as briefingService from '../services/briefing.service';

const router = Router();
router.use(authenticate);

// GET 简报列表
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 12;
    const result = await briefingService.list(page, pageSize);
    res.json(result);
  } catch (err) { next(err); }
});

// POST 生成简报
router.post('/generate', requireAdminOrPartner, validate(briefingGenerateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, periodStart, periodEnd } = req.body;
    const report = await briefingService.generate(
      type,
      periodStart,
      periodEnd,
      req.userId!,
    );
    res.status(201).json(report);
  } catch (err) { next(err); }
});

export default router;
