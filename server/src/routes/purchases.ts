import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireAdminOrPartner } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { purchaseSchema, purchaseUpdateSchema } from '../types/schemas';
import * as purchaseService from '../services/purchase.service';

const router = Router();
router.use(authenticate);

// 文件类型白名单
const ALLOWED_INVOICE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const uploadInvoice = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_INVOICE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('发票文件格式不支持，仅支持 JPEG/PNG/WebP/PDF'));
  },
});

// GET 采购列表
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await purchaseService.list(page, pageSize, {
      supplierId: req.query.supplierId as string,
      productId: req.query.productId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    });
    res.json(result);
  } catch (err) { next(err); }
});

// GET 采购详情
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await purchaseService.getById(req.params.id);
    res.json(purchase);
  } catch (err) { next(err); }
});

// POST 手动创建采购
router.post('/', requireAdminOrPartner, validate(purchaseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await purchaseService.create(req.body, req.userId!);
    res.status(201).json(purchase);
  } catch (err) { next(err); }
});

// PUT 编辑采购记录
router.put('/:id', requireAdminOrPartner, validate(purchaseUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const purchase = await purchaseService.update(req.params.id, req.body);
    res.json(purchase);
  } catch (err) { next(err); }
});

// DELETE 删除采购记录
router.delete('/:id', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await purchaseService.remove(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) { next(err); }
});

// POST 上传发票
router.post('/:id/invoice', requireAdminOrPartner, uploadInvoice.single('invoice'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传发票文件' });
      return;
    }
    const fileService = await import('../services/file.service');
    const fileUrl = await fileService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    );
    const purchase = await purchaseService.uploadInvoice(req.params.id, fileUrl);
    res.json(purchase);
  } catch (err) { next(err); }
});

export default router;
