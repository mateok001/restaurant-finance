import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdminOrPartner } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { salaryRecordSchema, salaryBatchSchema, salaryUpdateSchema } from '../types/schemas';
import * as salaryService from '../services/salary.service';

const router = Router();
router.use(authenticate);

// GET 工资报表（必须在 /report 之前，否则会被 /:id 匹配）
router.get('/report', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await salaryService.getReport({
      periodStart: req.query.periodStart as string,
      periodEnd: req.query.periodEnd as string,
      employeeId: req.query.employeeId as string,
      position: req.query.position as string,
    });
    res.json(result);
  } catch (err) { next(err); }
});

// GET 工资记录列表
router.get('/', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await salaryService.list(page, pageSize, {
      employeeId: req.query.employeeId as string,
      payDateStart: req.query.payDateStart as string,
      payDateEnd: req.query.payDateEnd as string,
      payStatus: req.query.payStatus as string,
    });
    res.json(result);
  } catch (err) { next(err); }
});

// GET 工资详情
router.get('/:id', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await salaryService.getById(req.params.id as string);
    res.json(record);
  } catch (err) { next(err); }
});

// POST 录入单条工资
router.post('/', requireAdminOrPartner, validate(salaryRecordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await salaryService.create(req.body, req.userId!);
    res.status(201).json(record);
  } catch (err) { next(err); }
});

// POST 批量生成当月工资
router.post('/batch', requireAdminOrPartner, validate(salaryBatchSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { periodStart, periodEnd } = req.body;
    const records = await salaryService.batchCreate(periodStart, periodEnd, req.userId!);
    res.status(201).json(records);
  } catch (err) { next(err); }
});

// PUT 修改工资记录
router.put('/:id', requireAdminOrPartner, validate(salaryUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await salaryService.update(req.params.id as string, req.body);
    res.json(record);
  } catch (err) { next(err); }
});

// PATCH 标记已发放
router.patch('/:id/pay', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await salaryService.markAsPaid(req.params.id as string);
    res.json(record);
  } catch (err) { next(err); }
});

// PATCH 撤销已发放
router.patch('/:id/unpay', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await salaryService.unmarkPaid(req.params.id as string);
    res.json(record);
  } catch (err) { next(err); }
});

// DELETE 删除工资记录
router.delete('/:id', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await salaryService.remove(req.params.id as string);
    res.json({ message: '删除成功' });
  } catch (err) { next(err); }
});

export default router;
