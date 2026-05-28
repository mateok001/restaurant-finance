import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { InputMethod } from '../types/enums';

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
    inputMethod?: InputMethod;
    startDate?: string;
    endDate?: string;
  },
) {
  const where: any = {};
  if (filters?.supplierId) where.supplierId = filters.supplierId;
  if (filters?.productId) where.productId = filters.productId;
  if (filters?.inputMethod) where.inputMethod = filters.inputMethod;
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
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  purchaseDate: string;
  inputMethod: InputMethod;
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
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      totalAmount: data.totalAmount,
      purchaseDate: new Date(data.purchaseDate),
      recordedBy: userId,
      inputMethod: data.inputMethod,
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

export async function createFromVoice(
  items: Array<{
    productName: string;
    supplierName?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>,
  purchaseDate: string,
  rawText: string,
  userId: string,
) {
  const results = [];
  for (const item of items) {
    let supplierId: string | null = null;
    if (item.supplierName) {
      let supplier = await prisma.supplier.findFirst({
        where: { name: { contains: item.supplierName } },
      });
      if (!supplier) {
        supplier = await prisma.supplier.create({ data: { name: item.supplierName } });
      }
      supplierId = supplier.id;
    }

    if (!supplierId) throw new AppError(400, `无法确定供应商: ${item.productName}`);

    let product = await prisma.product.findFirst({
      where: { name: { contains: item.productName } },
    });
    if (!product) {
      product = await prisma.product.create({
        data: { name: item.productName, category: 'ingredients' },
      });
    }

    const purchase = await prisma.purchase.create({
      data: {
        supplierId: supplierId!,
        productId: product.id,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.quantity * item.unitPrice,
        purchaseDate: new Date(purchaseDate),
        recordedBy: userId,
        inputMethod: 'voice',
        rawInputText: rawText,
      },
    });
    results.push(purchase);
  }
  return results;
}

export async function createFromOcr(
  items: Array<{
    productName: string;
    supplierName?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalAmount: number;
  }>,
  purchaseDate: string,
  rawText: string,
  userId: string,
) {
  const results = [];
  for (const item of items) {
    let supplierId: string | null = null;
    if (item.supplierName) {
      let supplier = await prisma.supplier.findFirst({
        where: { name: { contains: item.supplierName } },
      });
      if (!supplier) {
        supplier = await prisma.supplier.create({ data: { name: item.supplierName } });
      }
      supplierId = supplier.id;
    }
    if (!supplierId) throw new AppError(400, `无法确定供应商: ${item.productName}`);

    let product = await prisma.product.findFirst({
      where: { name: { contains: item.productName } },
    });
    if (!product) {
      product = await prisma.product.create({
        data: { name: item.productName, category: 'ingredients' },
      });
    }

    const purchase = await prisma.purchase.create({
      data: {
        supplierId: supplierId!,
        productId: product.id,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalAmount: item.totalAmount,
        purchaseDate: new Date(purchaseDate),
        recordedBy: userId,
        inputMethod: 'ocr',
        rawInputText: rawText,
      },
    });
    results.push(purchase);
  }
  return results;
}

export async function uploadInvoice(id: string, fileUrl: string) {
  await getById(id);
  return prisma.purchase.update({
    where: { id },
    data: { invoiceFileUrl: fileUrl },
  });
}
