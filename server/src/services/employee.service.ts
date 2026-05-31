import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { EmployeePosition } from '../types/enums';

export async function list(page: number, pageSize: number, isActive?: boolean) {
  const where: any = {};
  if (isActive !== undefined) where.isActive = isActive;

  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    }),
    prisma.employee.count({ where }),
  ]);

  // 脱敏处理
  const safeItems = items.map(maskSensitiveInfo);
  return { items: safeItems, total, page, pageSize };
}

export async function getById(id: string, showFull: boolean = false) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new AppError(404, '员工不存在');
  return showFull ? employee : maskSensitiveInfo(employee);
}

function maskSensitiveInfo(employee: any) {
  return {
    ...employee,
    idCardNumber: employee.idCardNumber
      ? employee.idCardNumber.slice(0, 3) + '***********' + employee.idCardNumber.slice(-4)
      : null,
    bankCardNumber: employee.bankCardNumber
      ? '****' + employee.bankCardNumber.slice(-4)
      : null,
  };
}

export async function create(data: {
  name: string;
  idCardNumber: string;
  bankCardNumber: string;
  phone: string;
  baseSalary: number;
  scheduledPayDay: number;
  position: EmployeePosition;
  hireDate: string;
  remark?: string | null;
}) {
  return prisma.employee.create({
    data: { ...data, hireDate: new Date(data.hireDate) },
  });
}

export async function update(
  id: string,
  data: {
    name?: string;
    idCardNumber?: string;
    bankCardNumber?: string;
    phone?: string;
    baseSalary?: number;
    scheduledPayDay?: number;
    position?: EmployeePosition;
    hireDate?: string;
    remark?: string | null;
  },
) {
  await getById(id);
  const updateData: any = { ...data };
  if (data.hireDate) updateData.hireDate = new Date(data.hireDate);
  return prisma.employee.update({ where: { id }, data: updateData });
}

export async function toggleStatus(id: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new AppError(404, '员工不存在');

  const isActive = !employee.isActive;
  const now = new Date();
  const leaveDate = isActive ? null : new Date(now.getTime() + 8 * 60 * 60 * 1000);

  return prisma.employee.update({
    where: { id },
    data: { isActive, leaveDate },
  });
}

export async function remove(id: string) {
  const salaryCount = await prisma.salaryRecord.count({ where: { employeeId: id } });
  if (salaryCount > 0) {
    throw new AppError(400, '该员工存在工资记录，无法删除。请标记为离职');
  }
  return prisma.employee.delete({ where: { id } });
}
