import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import * as reportService from '../services/report.service';

const router = Router();
router.use(authenticate);

function getDateRange(req: Request): { startDate: Date; endDate: Date } {
  const startDate = req.query.startDate
    ? new Date(req.query.startDate as string)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = req.query.endDate
    ? new Date(req.query.endDate as string)
    : new Date();
  return { startDate, endDate };
}

// GET 收入支出汇总
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateRange = getDateRange(req);
    const groupBy = (req.query.groupBy as string) || 'day';
    const result = await reportService.getSummary(dateRange, groupBy);
    res.json(result);
  } catch (err) { next(err); }
});

// GET 按商品统计
router.get('/by-product', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateRange = getDateRange(req);
    const result = await reportService.getByProduct(dateRange);
    res.json(result);
  } catch (err) { next(err); }
});

// GET 按供应商统计
router.get('/by-supplier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateRange = getDateRange(req);
    const result = await reportService.getBySupplier(dateRange);
    res.json(result);
  } catch (err) { next(err); }
});

// GET 利润报表
router.get('/profit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateRange = getDateRange(req);
    const result = await reportService.getProfit(dateRange);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
