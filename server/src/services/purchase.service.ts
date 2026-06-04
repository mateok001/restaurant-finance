import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveSupplier(idOrName: string): Promise<string> {
  if (uuidRegex.test(idOrName)) {
    const s = await prisma.supplier.findUnique({ where: { id: idOrName } });
    if (!s) throw new AppError(404, '供应商不存在');
    return s.id;
  }
  // Treat as name — look up or create
  let supplier = await prisma.supplier.findFirst({ where: { name: idOrName } });
  if (!supplier) {
    supplier = await prisma.supplier.create({ data: { name: idOrName } });
  }
  return supplier.id;
}

async function resolveProduct(idOrName: string): Promise<string> {
  if (uuidRegex.test(idOrName)) {
    const p = await prisma.product.findUnique({ where: { id: idOrName } });
    if (!p) throw new AppError(404, '商品不存在');
    return p.id;
  }
  let product = await prisma.product.findFirst({ where: { name: idOrName } });
  if (!product) {
    product = await prisma.product.create({ data: { name: idOrName, category: 'ingredients' } });
  }
  return product.id;
}

export async function list(
  page: number,
  pageSize: number,
  filters?: {
    supplierId?: string;
    productId?: string;
    startDate?: string;
    endDate?: string;
  },
) {
  const where: any = {};
  if (filters?.supplierId) where.supplierId = filters.supplierId;
  if (filters?.productId) where.productId = filters.productId;
  if (filters?.startDate || filters?.endDate) {
    where.purchaseDate = {};
    if (filters?.startDate) where.purchaseDate.gte = new Date(`${filters.startDate}T00:00:00+08:00`);
    if (filters?.endDate) where.purchaseDate.lte = new Date(`${filters.endDate}T23:59:59+08:00`);
  }

  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        supplier: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        recorder: { select: { id: true, displayName: true } },
      },
      orderBy: { purchaseDate: 'desc' },
    }),
    prisma.purchase.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getById(id: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      product: true,
      recorder: { select: { id: true, displayName: true } },
    },
  });
  if (!purchase) throw new AppError(404, '采购记录不存在');
  return purchase;
}

export async function create(data: {
  supplierId: string;
  productId: string;
  unit?: string | null;
  quantity?: number;
  unitPrice?: number;
  totalAmount: number;
  purchaseDate: string;
  memo?: string | null;
  rawInputText?: string | null;
}, userId: string) {
  const supplierId = await resolveSupplier(data.supplierId);
  const productId = await resolveProduct(data.productId);

  return prisma.purchase.create({
    data: {
      supplierId,
      productId,
      unit: data.unit || null,
      quantity: data.quantity ?? 0,
      unitPrice: data.unitPrice ?? 0,
      totalAmount: data.totalAmount,
      purchaseDate: new Date(data.purchaseDate),
      recordedBy: userId,
      inputMethod: 'manual',
      memo: data.memo || null,
      rawInputText: data.rawInputText || null,
    },
  });
}

export async function update(
  id: string,
  data: {
    supplierId?: string;
    productId?: string;
    unit?: string | null;
    quantity?: number;
    unitPrice?: number;
    totalAmount?: number;
    purchaseDate?: string;
    memo?: string | null;
  },
) {
  await getById(id);
  const updateData: any = { ...data };
  if (data.supplierId) updateData.supplierId = await resolveSupplier(data.supplierId);
  if (data.productId) updateData.productId = await resolveProduct(data.productId);
  if (data.purchaseDate) updateData.purchaseDate = new Date(data.purchaseDate);
  return prisma.purchase.update({ where: { id }, data: updateData });
}

export async function remove(id: string) {
  await getById(id);
  return prisma.purchase.delete({ where: { id } });
}

export async function uploadInvoice(id: string, fileUrl: string) {
  await getById(id);
  return prisma.purchase.update({
    where: { id },
    data: { invoiceFileUrl: fileUrl },
  });
}
