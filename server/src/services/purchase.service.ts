import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { InputMethod } from '../types/enums';

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
    if (filters?.startDate) where.purchaseDate.gte = new Date(filters.startDate);
    if (filters?.endDate) where.purchaseDate.lte = new Date(filters.endDate);
  }

  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        supplier: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, unit: true } },
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
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  purchaseDate: string;
  inputMethod: InputMethod;
  memo?: string | null;
  rawInputText?: string | null;
}, userId: string) {
  return prisma.purchase.create({
    data: {
      ...data,
      purchaseDate: new Date(data.purchaseDate),
      recordedBy: userId,
    },
  });
}

export async function update(
  id: string,
  data: {
    supplierId?: string;
    productId?: string;
    quantity?: number;
    unitPrice?: number;
    totalAmount?: number;
    purchaseDate?: string;
    memo?: string | null;
  },
) {
  await getById(id);
  const updateData: any = { ...data };
  if (data.purchaseDate) {
    updateData.purchaseDate = new Date(data.purchaseDate);
  }
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
    // 查找或创建供应商
    let supplierId: string | null = null;
    if (item.supplierName) {
      let supplier = await prisma.supplier.findFirst({
        where: { name: { contains: item.supplierName } },
      });
      if (!supplier) {
        supplier = await prisma.supplier.create({
          data: { name: item.supplierName },
        });
      }
      supplierId = supplier.id;
    }

    if (!supplierId) throw new AppError(400, `无法确定供应商: ${item.productName}`);

    // 查找或创建商品
    let product = await prisma.product.findFirst({
      where: { name: { contains: item.productName } },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: item.productName,
          category: 'ingredients',
          unit: item.unit,
          defaultPrice: item.unitPrice,
          supplierId,
        },
      });
    }

    const purchase = await prisma.purchase.create({
      data: {
        supplierId: supplierId!,
        productId: product.id,
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
        data: {
          name: item.productName,
          category: 'ingredients',
          unit: item.unit,
          defaultPrice: item.unitPrice,
          supplierId,
        },
      });
    }

    const purchase = await prisma.purchase.create({
      data: {
        supplierId: supplierId!,
        productId: product.id,
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
