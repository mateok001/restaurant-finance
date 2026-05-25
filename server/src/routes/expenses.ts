import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireAdminOrPartner } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { expenseSchema } from '../types/schemas';
import * as expenseService from '../services/expense.service';
import * as fileService from '../services/file.service';

const router = Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

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
    const expense = await expenseService.getById(req.params.id);
    res.json(expense);
  } catch (err) { next(err); }
});

router.post('/', requireAdminOrPartner, validate(expenseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.create(req.body, req.userId!);
    res.status(201).json(expense);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.update(req.params.id, req.body);
    res.json(expense);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await expenseService.remove(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) { next(err); }
});

router.post('/:id/invoice', requireAdminOrPartner, upload.single('invoice'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传发票文件' });
      return;
    }
    const fileUrl = await fileService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    const expense = await expenseService.uploadInvoice(req.params.id, fileUrl);
    res.json(expense);
  } catch (err) { next(err); }
});

export default router;
