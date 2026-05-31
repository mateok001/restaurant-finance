import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { ExpenseCategory } from '../types/enums';

export async function list(
  page: number,
  pageSize: number,
  filters?: {
    category?: ExpenseCategory;
    startDate?: string;
    endDate?: string;
  },
) {
  const where: any = {};
  if (filters?.category) where.category = filters.category;
  if (filters?.startDate || filters?.endDate) {
    where.expenseDate = {};
    if (filters?.startDate) where.expenseDate.gte = new Date(`${filters.startDate}T00:00:00+08:00`);
    if (filters?.endDate) where.expenseDate.lte = new Date(`${filters.endDate}T23:59:59+08:00`);
  }

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { recorder: { select: { id: true, displayName: true } } },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.expense.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getById(id: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { recorder: { select: { id: true, displayName: true } } },
  });
  if (!expense) throw new AppError(404, '支出记录不存在');
  return expense;
}

export async function create(data: {
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  description?: string | null;
}, userId: string) {
  return prisma.expense.create({
    data: {
      ...data,
      expenseDate: new Date(`${data.expenseDate}T00:00:00+08:00`),
      recordedBy: userId,
    },
  });
}

export async function update(
  id: string,
  data: {
    category?: ExpenseCategory;
    amount?: number;
    expenseDate?: string;
    description?: string | null;
  },
) {
  await getById(id);
  const updateData: any = { ...data };
  if (data.expenseDate) updateData.expenseDate = new Date(data.expenseDate);
  return prisma.expense.update({ where: { id }, data: updateData });
}

export async function remove(id: string) {
  await getById(id);
  const expense = await prisma.expense.findUnique({ where: { id }, select: { salaryRecordId: true } });
  if (expense?.salaryRecordId) {
    throw new AppError(400, '该支出为工资自动生成，请通过工资管理删除');
  }
  return prisma.expense.delete({ where: { id } });
}

export async function uploadInvoice(id: string, fileUrl: string) {
  await getById(id);
  return prisma.expense.update({ where: { id }, data: { invoiceFileUrl: fileUrl } });
}
