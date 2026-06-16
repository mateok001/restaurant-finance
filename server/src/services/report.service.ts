import { prisma } from '../utils/prisma';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export async function getSummary(dateRange: DateRange, _groupBy?: string) {
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
      start: chinaDateParts(dateRange.startDate).dateStr,
      end: chinaDateParts(dateRange.endDate).dateStr,
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

export async function getByProduct(dateRange: DateRange, productName?: string) {
  const where: any = {
    purchaseDate: { gte: dateRange.startDate, lte: dateRange.endDate },
  };
  if (productName) where.product = { name: { contains: productName } };

  const purchases = await prisma.purchase.findMany({
    where,
    include: { product: { select: { name: true } } },
  });

  const byProduct = new Map<string, { name: string; unit: string | null; totalQuantity: number; totalAmount: number; count: number }>();
  for (const p of purchases) {
    const key = p.productId;
    if (!byProduct.has(key)) {
      byProduct.set(key, { name: p.product.name, unit: p.unit, totalQuantity: 0, totalAmount: 0, count: 0 });
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

export async function getBySupplier(dateRange: DateRange, supplierName?: string) {
  const where: any = {
    purchaseDate: { gte: dateRange.startDate, lte: dateRange.endDate },
  };
  if (supplierName) where.supplier = { name: { contains: supplierName } };

  const purchases = await prisma.purchase.findMany({
    where,
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

  const profitMargin =
    summary.summary.totalRevenue > 0
      ? Math.round((summary.summary.netProfit / summary.summary.totalRevenue) * 10000) / 100
      : 0;

  return {
    ...summary.summary,
    profitMargin,
    revenueByChannel: summary.revenueByChannel,
    expensesByCategory: summary.expensesByCategory,
    details: summary.details,
  };
}

function chinaDateParts(d: Date): { year: number; month: number; day: number; dateStr: string } {
  const shifted = new Date(d.getTime() + 8 * 3600000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return { year, month, day, dateStr: `${year}-${mm}-${dd}` };
}

export async function getRevenueAnalysis(year: number, granularity: 'day' | 'month' | 'quarter' | 'year', month?: number) {
  // Fetch all needed data in bulk: current year + last year + edge periods for 环比
  const curStart = new Date(`${year}-01-01T00:00:00+08:00`);
  const curEnd = new Date(`${year}-12-31T23:59:59+08:00`);
  const prevStart = new Date(`${year - 1}-01-01T00:00:00+08:00`);
  const prevEnd = new Date(`${year - 1}-12-31T23:59:59+08:00`);
  // Also need one more year back for YoY when showing yearly data, and one more period for 环比
  const extraStart = new Date(`${year - 2}-01-01T00:00:00+08:00`);
  const extraEnd = new Date(`${year - 2}-12-31T23:59:59+08:00`);

  const allRecords = await prisma.dailyRevenue.findMany({
    where: { revenueDate: { gte: extraStart, lte: curEnd } },
    orderBy: { revenueDate: 'asc' },
  });

  // Group by China date (UTC+8)
  const byDay = new Map<string, number>();
  for (const r of allRecords) {
    const { dateStr } = chinaDateParts(r.revenueDate);
    byDay.set(dateStr, (byDay.get(dateStr) || 0) + r.amount);
  }

  const round = (v: number) => Math.round(v * 100) / 100;
  const getRevenue = (start: string, end: string) => {
    let sum = 0;
    for (const [date, amt] of byDay) {
      if (date >= start && date <= end) sum += amt;
    }
    return round(sum);
  };

  const results: Array<{
    period: string;
    revenue: number;
    lastYearRevenue: number;
    lastPeriodRevenue: number;
    yoyChange: number | null;
    momChange: number | null;
  }> = [];

  if (granularity === 'year') {
    for (let y = year - 5; y <= year; y++) {
      const cy = String(y);
      const ly = String(y - 1);
      const py = String(y - 1);
      const revenue = getRevenue(`${cy}-01-01`, `${cy}-12-31`);
      const lastYearRevenue = getRevenue(`${ly}-01-01`, `${ly}-12-31`);
      results.push({
        period: `${y}年`,
        revenue,
        lastYearRevenue,
        lastPeriodRevenue: 0,
        yoyChange: lastYearRevenue !== 0 ? round((revenue - lastYearRevenue) / lastYearRevenue * 100) : null,
        momChange: null,
      });
    }
  } else if (granularity === 'quarter') {
    const qDefs = [
      { label: 'Q1', s: '-01-01', e: '-03-31' },
      { label: 'Q2', s: '-04-01', e: '-06-30' },
      { label: 'Q3', s: '-07-01', e: '-09-30' },
      { label: 'Q4', s: '-10-01', e: '-12-31' },
    ];
    for (let i = 0; i < 4; i++) {
      const q = qDefs[i];
      const revenue = getRevenue(`${year}${q.s}`, `${year}${q.e}`);
      const lastYearRevenue = getRevenue(`${year - 1}${q.s}`, `${year - 1}${q.e}`);
      const prevQ = i > 0 ? qDefs[i - 1] : qDefs[3];
      const prevY = i > 0 ? year : year - 1;
      const lastPeriodRevenue = getRevenue(`${prevY}${prevQ.s}`, `${prevY}${prevQ.e}`);
      results.push({
        period: `${year} ${q.label}`,
        revenue,
        lastYearRevenue,
        lastPeriodRevenue,
        yoyChange: lastYearRevenue !== 0 ? round((revenue - lastYearRevenue) / lastYearRevenue * 100) : null,
        momChange: lastPeriodRevenue !== 0 ? round((revenue - lastPeriodRevenue) / lastPeriodRevenue * 100) : null,
      });
    }
  } else if (granularity === 'month') {
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      const daysInMonth = new Date(year, m, 0).getDate();
      const revenue = getRevenue(`${year}-${mm}-01`, `${year}-${mm}-${daysInMonth}`);
      const lyDays = new Date(year - 1, m, 0).getDate();
      const lastYearRevenue = getRevenue(`${year - 1}-${mm}-01`, `${year - 1}-${mm}-${lyDays}`);
      const prevM = m === 1 ? 12 : m - 1;
      const prevY = m === 1 ? year - 1 : year;
      const prevDays = new Date(prevY, prevM, 0).getDate();
      const prevMM = String(prevM).padStart(2, '0');
      const lastPeriodRevenue = getRevenue(`${prevY}-${prevMM}-01`, `${prevY}-${prevMM}-${prevDays}`);
      results.push({
        period: `${year}-${mm}`,
        revenue,
        lastYearRevenue,
        lastPeriodRevenue,
        yoyChange: lastYearRevenue !== 0 ? round((revenue - lastYearRevenue) / lastYearRevenue * 100) : null,
        momChange: lastPeriodRevenue !== 0 ? round((revenue - lastPeriodRevenue) / lastPeriodRevenue * 100) : null,
      });
    }
  } else if (granularity === 'day' && month) {
    const mm = String(month).padStart(2, '0');
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const revenue = getRevenue(dateStr, dateStr);
      const lyDateStr = `${year - 1}-${mm}-${dd}`;
      let lastYearRevenue = 0;
      const lyDaysInMonth = new Date(year - 1, month, 0).getDate();
      if (d <= lyDaysInMonth) lastYearRevenue = getRevenue(lyDateStr, lyDateStr);
      let lastPeriodRevenue = 0;
      let prevDateStr: string;
      if (d > 1) {
        prevDateStr = `${year}-${mm}-${String(d - 1).padStart(2, '0')}`;
      } else {
        const prevM = month === 1 ? 12 : month - 1;
        const prevY = month === 1 ? year - 1 : year;
        const prevDays = new Date(prevY, prevM, 0).getDate();
        prevDateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevDays).padStart(2, '0')}`;
      }
      lastPeriodRevenue = getRevenue(prevDateStr, prevDateStr);
      results.push({
        period: dateStr,
        revenue,
        lastYearRevenue,
        lastPeriodRevenue,
        yoyChange: lastYearRevenue !== 0 ? round((revenue - lastYearRevenue) / lastYearRevenue * 100) : null,
        momChange: lastPeriodRevenue !== 0 ? round((revenue - lastPeriodRevenue) / lastPeriodRevenue * 100) : null,
      });
    }
  }

  return { granularity, year, month: month || null, data: results };
}

export async function getTrends(dateRange: DateRange) {
  const summary = await getSummary(dateRange, 'day');

  const dailyMap = new Map<string, { revenue: number; purchaseCost: number; expenses: number }>();

  for (const r of summary.details.revenues) {
    const { dateStr: day } = chinaDateParts(r.revenueDate);
    const entry = dailyMap.get(day) || { revenue: 0, purchaseCost: 0, expenses: 0 };
    entry.revenue += r.amount;
    dailyMap.set(day, entry);
  }

  for (const p of summary.details.purchases) {
    const { dateStr: day } = chinaDateParts(p.purchaseDate);
    const entry = dailyMap.get(day) || { revenue: 0, purchaseCost: 0, expenses: 0 };
    entry.purchaseCost += p.totalAmount;
    dailyMap.set(day, entry);
  }

  for (const e of summary.details.expenses) {
    const { dateStr: day } = chinaDateParts(e.expenseDate);
    const entry = dailyMap.get(day) || { revenue: 0, purchaseCost: 0, expenses: 0 };
    entry.expenses += e.amount;
    dailyMap.set(day, entry);
  }

  const trends = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      purchaseCost: Math.round(data.purchaseCost * 100) / 100,
      expenses: Math.round(data.expenses * 100) / 100,
      grossProfit: Math.round((data.revenue - data.purchaseCost) * 100) / 100,
      netProfit: Math.round((data.revenue - data.purchaseCost - data.expenses) * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return trends;
}
