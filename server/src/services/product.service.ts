import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { ProductCategory } from '../types/enums';

export async function list(
  page: number,
  pageSize: number,
  category?: ProductCategory,
  supplierId?: string,
) {
  const where: any = {};
  if (category) where.category = category;
  if (supplierId) where.supplierId = supplierId;

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { supplier: { select: { id: true, name: true } } },
  });
  if (!product) throw new AppError(404, '商品不存在');
  return product;
}

export async function create(data: {
  name: string;
  category: ProductCategory;
  unit: string;
  defaultPrice?: number | null;
  supplierId?: string | null;
}) {
  return prisma.product.create({ data });
}

export async function update(
  id: string,
  data: {
    name?: string;
    category?: ProductCategory;
    unit?: string;
    defaultPrice?: number | null;
    supplierId?: string | null;
  },
) {
  await getById(id);
  return prisma.product.update({ where: { id }, data });
}

export async function remove(id: string) {
  await getById(id);
  const purchases = await prisma.purchase.count({ where: { productId: id } });
  if (purchases > 0) {
    throw new AppError(400, '该商品存在关联的采购记录，无法删除');
  }
  return prisma.product.delete({ where: { id } });
}
