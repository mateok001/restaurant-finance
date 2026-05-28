import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import * as reportService from '../services/report.service';

const router = Router();
router.use(authenticate);

function getDateRange(req: Request): { startDate: Date; endDate: Date } {
  const now = new Date();
  const defaultEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const defaultStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const startDate = req.query.startDate
    ? new Date(`${req.query.startDate as string}T00:00:00+08:00`)
    : new Date(`${defaultStart}T00:00:00+08:00`);
  const endDate = req.query.endDate
    ? new Date(`${req.query.endDate as string}T23:59:59+08:00`)
    : new Date(`${defaultEnd}T23:59:59+08:00`);
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
    const productName = req.query.productName as string | undefined;
    const result = await reportService.getByProduct(dateRange, productName);
    res.json(result);
  } catch (err) { next(err); }
});

// GET 按供应商统计
router.get('/by-supplier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateRange = getDateRange(req);
    const supplierName = req.query.supplierName as string | undefined;
    const result = await reportService.getBySupplier(dateRange, supplierName);
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

// GET 营业额分析
router.get('/revenue-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const granularity = (req.query.granularity as string) || 'month';
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;
    if (!['day', 'month', 'quarter', 'year'].includes(granularity)) {
      res.status(400).json({ error: 'granularity must be day, month, quarter, or year' });
      return;
    }
    if (granularity === 'day' && !month) {
      res.status(400).json({ error: 'month is required when granularity is day' });
      return;
    }
    const result = await reportService.getRevenueAnalysis(year, granularity as any, month);
    res.json(result);
  } catch (err) { next(err); }
});

// GET 趋势数据
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dateRange = getDateRange(req);
    const result = await reportService.getTrends(dateRange);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
