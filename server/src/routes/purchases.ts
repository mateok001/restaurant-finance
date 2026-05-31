import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireAdminOrPartner } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { purchaseSchema, purchaseUpdateSchema } from '../types/schemas';
import * as purchaseService from '../services/purchase.service';
import * as voiceService from '../services/voice.service';
import * as ocrService from '../services/ocr.service';

const router = Router();
router.use(authenticate);

// 文件类型白名单
const ALLOWED_AUDIO_TYPES = ['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/mp4', 'audio/ogg'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_INVOICE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('音频格式不支持，仅支持 WAV/MP3/WebM/MP4/OGG'));
  },
});

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('图片格式不支持，仅支持 JPEG/PNG/WebP'));
  },
});

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
      inputMethod: req.query.inputMethod as any,
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

// POST 语音录入采购
router.post('/voice', requireAdminOrPartner, uploadAudio.single('audio'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传音频文件' });
      return;
    }
    const purchaseDate = req.body.purchaseDate || new Date().toISOString().slice(0, 10);
    const result = await voiceService.processVoiceInput(
      req.file.buffer,
      purchaseDate,
      req.userId!,
    );
    res.json(result);
  } catch (err) { next(err); }
});

// POST OCR 图片录入采购
router.post('/ocr', requireAdminOrPartner, uploadImage.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传进货单图片' });
      return;
    }
    const purchaseDate = req.body.purchaseDate || new Date().toISOString().slice(0, 10);
    const result = await ocrService.processOcrInput(
      req.file.buffer,
      purchaseDate,
      req.userId!,
    );
    res.json(result);
  } catch (err) { next(err); }
});

// POST 确认并提交语音/OCR解析结果
router.post('/confirm-parsed', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, purchaseDate, rawText, inputMethod } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: '采购明细不能为空' });
      return;
    }

    let results;
    if (inputMethod === 'voice') {
      results = await purchaseService.createFromVoice(items, purchaseDate, rawText, req.userId!);
    } else if (inputMethod === 'ocr') {
      results = await purchaseService.createFromOcr(items, purchaseDate, rawText, req.userId!);
    } else {
      res.status(400).json({ error: 'inputMethod 必须为 voice 或 ocr' });
      return;
    }
    res.status(201).json(results);
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
