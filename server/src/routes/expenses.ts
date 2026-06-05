import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireAdminOrPartner } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { expenseSchema, expenseUpdateSchema } from '../types/schemas';
import * as expenseService from '../services/expense.service';
import * as fileService from '../services/file.service';

const router = Router();
router.use(authenticate);

const uploadInvoice = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('发票文件格式不支持，仅支持 JPEG/PNG/WebP/PDF'));
  },
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await expenseService.list(page, pageSize, {
      category: req.query.category as any,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.getById(req.params.id as string);
    res.json(expense);
  } catch (err) { next(err); }
});

router.post('/', requireAdminOrPartner, validate(expenseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.create(req.body, req.userId!);
    res.status(201).json(expense);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdminOrPartner, validate(expenseUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.update(req.params.id as string, req.body);
    res.json(expense);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await expenseService.remove(req.params.id as string);
    res.json({ message: '删除成功' });
  } catch (err) { next(err); }
});

router.post('/:id/invoice', requireAdminOrPartner, uploadInvoice.single('invoice'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传发票文件' });
      return;
    }
    const fileUrl = await fileService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    const expense = await expenseService.uploadInvoice(req.params.id as string, fileUrl);
    res.json(expense);
  } catch (err) { next(err); }
});

export default router;
