import { prisma } from '../utils/prisma';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export async function getSummary(dateRange: DateRange, groupBy: string) {
  // 收入汇总
  const revenues = await prisma.dailyRevenue.findMany({
    where: {
      revenueDate: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    include: { channel: { select: { name: true } } },
    orderBy: { revenueDate: 'asc' },
  });

  // 采购汇总
  const purchases = await prisma.purchase.findMany({
    where: {
      purchaseDate: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    include: {
      product: { select: { name: true, category: true } },
      supplier: { select: { name: true } },
    },
    orderBy: { purchaseDate: 'asc' },
  });

  // 支出汇总
  const expenses = await prisma.expense.findMany({
    where: {
      expenseDate: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    orderBy: { expenseDate: 'asc' },
  });

  const totalRevenue = revenues.reduce((s, r) => s + r.amount, 0);
  const totalPurchaseCost = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = totalRevenue - totalPurchaseCost;
  const netProfit = grossProfit - totalExpenses;

  // 按渠道分组收入
  const revenueByChannel = new Map<string, number>();
  for (const r of revenues) {
    const name = r.channel.name;
    revenueByChannel.set(name, (revenueByChannel.get(name) || 0) + r.amount);
  }

  // 按支出类别分组
  const expensesByCategory = new Map<string, number>();
  for (const e of expenses) {
    expensesByCategory.set(e.category, (expensesByCategory.get(e.category) || 0) + e.amount);
  }

  return {
    period: {
      start: dateRange.startDate.toISOString().slice(0, 10),
      end: dateRange.endDate.toISOString().slice(0, 10),
    },
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalPurchaseCost: Math.round(totalPurchaseCost * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
    },
    revenueByChannel: Object.fromEntries(revenueByChannel),
    expensesByCategory: Object.fromEntries(expensesByCategory),
    details: { revenues, purchases, expenses },
  };
}

export async function getByProduct(dateRange: DateRange) {
  const purchases = await prisma.purchase.findMany({
    where: {
      purchaseDate: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    include: { product: { select: { name: true, unit: true } } },
  });

  const byProduct = new Map<string, { name: string; unit: string; totalQuantity: number; totalAmount: number; count: number }>();
  for (const p of purchases) {
    const key = p.productId;
    if (!byProduct.has(key)) {
      byProduct.set(key, { name: p.product.name, unit: p.product.unit, totalQuantity: 0, totalAmount: 0, count: 0 });
    }
    const item = byProduct.get(key)!;
    item.totalQuantity += p.quantity;
    item.totalAmount += p.totalAmount;
    item.count++;
  }

  return Array.from(byProduct.entries())
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

export async function getBySupplier(dateRange: DateRange) {
  const purchases = await prisma.purchase.findMany({
    where: {
      purchaseDate: { gte: dateRange.startDate, lte: dateRange.endDate },
    },
    include: { supplier: { select: { name: true } } },
  });

  const bySupplier = new Map<string, { name: string; totalAmount: number; count: number }>();
  for (const p of purchases) {
    const key = p.supplierId;
    if (!bySupplier.has(key)) {
      bySupplier.set(key, { name: p.supplier.name, totalAmount: 0, count: 0 });
    }
    const item = bySupplier.get(key)!;
    item.totalAmount += p.totalAmount;
    item.count++;
  }

  return Array.from(bySupplier.entries())
    .map(([supplierId, data]) => ({ supplierId, ...data }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

export async function getProfit(dateRange: DateRange) {
  const summary = await getSummary(dateRange, 'day');

  // 计算利润率
  const profitMargin =
    summary.summary.totalRevenue > 0
      ? Math.round((summary.summary.netProfit / summary.summary.totalRevenue) * 10000) / 100
      : 0;

  return {
    ...summary.summary,
    profitMargin,
    revenueByChannel: summary.revenueByChannel,
    expensesByCategory: summary.expensesByCategory,
  };
}
