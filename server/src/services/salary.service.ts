import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export async function list(
  page: number,
  pageSize: number,
  filters?: {
    employeeId?: string;
    periodStart?: string;
    periodEnd?: string;
    payStatus?: string;
  },
) {
  const where: any = {};
  if (filters?.employeeId) where.employeeId = filters.employeeId;
  if (filters?.payStatus) where.payStatus = filters.payStatus;
  if (filters?.periodStart) where.periodStart = { gte: new Date(filters.periodStart) };
  if (filters?.periodEnd) where.periodEnd = { lte: new Date(filters.periodEnd) };

  const [items, total] = await Promise.all([
    prisma.salaryRecord.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        employee: { select: { id: true, name: true, position: true } },
        recorder: { select: { id: true, displayName: true } },
      },
      orderBy: { periodStart: 'desc' },
    }),
    prisma.salaryRecord.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getById(id: string) {
  const record = await prisma.salaryRecord.findUnique({
    where: { id },
    include: {
      employee: true,
      recorder: { select: { id: true, displayName: true } },
    },
  });
  if (!record) throw new AppError(404, '工资记录不存在');
  return record;
}

export async function create(data: {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  bonus: number;
  deduction: number;
  attendanceStatus: any;
  scheduledPayDate: string;
  memo?: string | null;
}, userId: string) {
  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
  if (!employee) throw new AppError(404, '员工不存在');

  const grossSalary = employee.baseSalary + data.bonus - data.deduction;
  const netSalary = grossSalary;

  return prisma.salaryRecord.create({
    data: {
      employeeId: data.employeeId,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      baseSalary: employee.baseSalary,
      bonus: data.bonus,
      deduction: data.deduction,
      attendanceStatus: data.attendanceStatus,
      grossSalary,
      netSalary,
      scheduledPayDate: new Date(data.scheduledPayDate),
      recordedBy: userId,
      memo: data.memo || null,
    },
  });
}

export async function batchCreate(
  periodStart: string,
  periodEnd: string,
  scheduledPayDate: string,
  userId: string,
) {
  const activeEmployees = await prisma.employee.findMany({
    where: { isActive: true },
  });

  if (activeEmployees.length === 0) {
    throw new AppError(400, '没有在岗员工');
  }

  // Check for existing salary records in the same period
  const existingCount = await prisma.salaryRecord.count({
    where: {
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    },
  });

  if (existingCount > 0) {
    throw new AppError(409, `该周期（${periodStart}~${periodEnd}）已有工资记录，请先删除后再生成`);
  }

  const results = [];
  for (const emp of activeEmployees) {
    const record = await prisma.salaryRecord.create({
      data: {
        employeeId: emp.id,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        baseSalary: emp.baseSalary,
        bonus: 0,
        deduction: 0,
        attendanceStatus: {
          fullAttendance: true,
          workDays: 0,
          lateDays: 0,
          absentDays: 0,
          leaveDays: 0,
        },
        grossSalary: emp.baseSalary,
        netSalary: emp.baseSalary,
        scheduledPayDate: new Date(scheduledPayDate),
        recordedBy: userId,
      },
    });
    results.push(record);
  }

  return results;
}

export async function update(
  id: string,
  data: {
    bonus?: number;
    deduction?: number;
    attendanceStatus?: any;
    netSalary?: number;
    scheduledPayDate?: string;
    memo?: string | null;
  },
) {
  const record = await getById(id);
  if (record.payStatus === 'paid') {
    throw new AppError(400, '已发放的工资记录不可修改');
  }

  const baseSalary = record.baseSalary;
  const bonus = data.bonus !== undefined ? data.bonus : record.bonus;
  const deduction = data.deduction !== undefined ? data.deduction : record.deduction;
  const grossSalary = baseSalary + bonus - deduction;
  const netSalary = data.netSalary !== undefined ? data.netSalary : grossSalary;

  const updateData: any = {
    bonus,
    deduction,
    grossSalary,
    netSalary,
  };
  if (data.attendanceStatus) updateData.attendanceStatus = data.attendanceStatus;
  if (data.scheduledPayDate) updateData.scheduledPayDate = new Date(data.scheduledPayDate);
  if (data.memo !== undefined) updateData.memo = data.memo;

  return prisma.salaryRecord.update({ where: { id }, data: updateData });
}

export async function markAsPaid(id: string) {
  const record = await getById(id);
  if (record.payStatus === 'paid') {
    throw new AppError(400, '该工资已发放');
  }

  const updatedRecord = await prisma.salaryRecord.update({
    where: { id },
    data: {
      payStatus: 'paid',
      actualPayDate: new Date(),
    },
  });

  const employee = await prisma.employee.findUnique({ where: { id: record.employeeId } });

  // 自动创建支出记录
  await prisma.expense.create({
    data: {
      category: 'salary',
      amount: record.netSalary,
      expenseDate: new Date(),
      recordedBy: record.recordedBy,
      description: `${employee?.name || '员工'} ${record.periodStart.toISOString().slice(0, 10)}~${record.periodEnd.toISOString().slice(0, 10)} 工资`,
      salaryRecordId: id,
    },
    // @ts-ignore - salaryRecordId is valid
  });

  return updatedRecord;
}

export async function remove(id: string) {
  const record = await getById(id);
  if (record.payStatus === 'paid') {
    throw new AppError(400, '已发放的工资记录不可删除，请先删除关联的支出记录');
  }
  return prisma.salaryRecord.delete({ where: { id } });
}

export async function getReport(filters?: {
  periodStart?: string;
  periodEnd?: string;
  employeeId?: string;
  position?: string;
}) {
  const where: any = {};
  if (filters?.employeeId) where.employeeId = filters.employeeId;
  if (filters?.periodStart || filters?.periodEnd) {
    where.periodStart = {};
    if (filters?.periodStart) where.periodStart.gte = new Date(filters.periodStart);
    if (filters?.periodEnd) where.periodStart.lte = new Date(filters.periodEnd);
  }
  if (filters?.position) {
    where.employee = { position: filters.position };
  }

  const records = await prisma.salaryRecord.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, position: true } },
    },
    orderBy: { periodStart: 'desc' },
  });

  // Aggregate by employee
  const byEmployee = new Map<string, { name: string; position: string; totalGross: number; totalNet: number; count: number }>();
  const byPosition = new Map<string, { totalGross: number; totalNet: number; count: number }>();

  for (const r of records) {
    const empKey = r.employeeId;
    if (!byEmployee.has(empKey)) {
      byEmployee.set(empKey, { name: r.employee.name, position: r.employee.position, totalGross: 0, totalNet: 0, count: 0 });
    }
    const emp = byEmployee.get(empKey)!;
    emp.totalGross += r.grossSalary;
    emp.totalNet += r.netSalary;
    emp.count++;

    const posKey = r.employee.position;
    if (!byPosition.has(posKey)) {
      byPosition.set(posKey, { totalGross: 0, totalNet: 0, count: 0 });
    }
    const pos = byPosition.get(posKey)!;
    pos.totalGross += r.grossSalary;
    pos.totalNet += r.netSalary;
    pos.count++;
  }

  return {
    total: {
      grossSalary: records.reduce((s, r) => s + r.grossSalary, 0),
      netSalary: records.reduce((s, r) => s + r.netSalary, 0),
      recordCount: records.length,
    },
    byEmployee: Array.from(byEmployee.entries()).map(([id, data]) => ({ employeeId: id, ...data })),
    byPosition: Array.from(byPosition.entries()).map(([position, data]) => ({ position, ...data })),
    records,
  };
}
