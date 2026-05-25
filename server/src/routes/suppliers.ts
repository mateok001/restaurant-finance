import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdminOrPartner } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { supplierSchema } from '../types/schemas';
import * as supplierService from '../services/supplier.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await supplierService.list(page, pageSize);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supplier = await supplierService.getById(req.params.id);
    res.json(supplier);
  } catch (err) { next(err); }
});

router.post('/', requireAdminOrPartner, validate(supplierSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supplier = await supplierService.create(req.body);
    res.status(201).json(supplier);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdminOrPartner, validate(supplierSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supplier = await supplierService.update(req.params.id, req.body);
    res.json(supplier);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await supplierService.remove(req.params.id);
    res.json({ message: '删除成功' });
  } catch (err) { next(err); }
});

export default router;
