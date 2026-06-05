import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdminOrPartner } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { employeeSchema } from '../types/schemas';
import * as employeeService from '../services/employee.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined;
    const result = await employeeService.list(page, pageSize, isActive);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const showFull = req.query.showFull === 'true';
    if (showFull && req.userRole !== 'admin' && req.userRole !== 'partner') {
      res.status(403).json({ error: '仅管理员和合伙人可查看完整信息' });
      return;
    }
    const employee = await employeeService.getById(req.params.id as string, showFull);
    res.json(employee);
  } catch (err) { next(err); }
});

router.post('/', requireAdminOrPartner, validate(employeeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeeService.create(req.body);
    res.status(201).json(employee);
  } catch (err) { next(err); }
});

router.put('/:id', requireAdminOrPartner, validate(employeeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeeService.update(req.params.id as string, req.body);
    res.json(employee);
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = await employeeService.toggleStatus(req.params.id as string);
    res.json(employee);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdminOrPartner, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await employeeService.remove(req.params.id as string);
    res.json({ message: '删除成功' });
  } catch (err) { next(err); }
});

export default router;
