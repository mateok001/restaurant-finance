import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export async function list(page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplier.count(),
  ]);
  return { items, total, page, pageSize };
}

export async function getById(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw new AppError(404, '供应商不存在');
  return supplier;
}

export async function create(data: {
  name: string;
  contactPhone?: string | null;
  contactPerson?: string | null;
  address?: string | null;
  remark?: string | null;
}) {
  return prisma.supplier.create({ data });
}

export async function update(
  id: string,
  data: {
    name?: string;
    contactPhone?: string | null;
    contactPerson?: string | null;
    address?: string | null;
    remark?: string | null;
  },
) {
  await getById(id);
  return prisma.supplier.update({ where: { id }, data });
}

export async function remove(id: string) {
  await getById(id);
  const purchases = await prisma.purchase.count({ where: { supplierId: id } });
  if (purchases > 0) {
    throw new AppError(400, '该供应商存在关联的采购记录，无法删除');
  }
  return prisma.supplier.delete({ where: { id } });
}
