import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdminOrPartner } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { productSchema } from '../types/schemas';
import * as productService from '../services/product.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const category = req.query.category as string;
    const result = await productService.list(page, pageSize, category);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getById(req.params.id);
    res.json(product);
  } catch (err) { next(err); }
});

router.post('/', requireAdminOrPartner, validate(productSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.create(req.body);
    res.status(201).json(product);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdminOrPartner, validate(productSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    res.json(product);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productService.remove(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) { next(err); }
});

export default router;
