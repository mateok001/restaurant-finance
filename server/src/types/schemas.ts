import { z } from 'zod';

// ========== 认证相关 ==========
export const loginSchema = z.object({
  username: z.string().min(2, '用户名至少2位').max(50),
  password: z.string().min(6, '密码至少6位'),
  remember: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(6),
  displayName: z.string().min(1).max(50),
  role: z.enum(['admin', 'partner', 'staff']).optional().default('staff'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(6, '新密码至少6位'),
});

// ========== 供应商 ==========
export const supplierSchema = z.object({
  name: z.string().min(1, '供应商名称必填').max(100),
  contactPhone: z.string().max(20).optional().nullable(),
  contactPerson: z.string().max(50).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  remark: z.string().optional().nullable(),
});

// ========== 商品 ==========
export const productSchema = z.object({
  name: z.string().min(1, '商品名称必填').max(100),
  category: z.enum(['ingredients', 'beverages', 'seasonings', 'packaging', 'other']),
});

// ========== 采购记录 ==========
export const purchaseSchema = z.object({
  supplierId: z.string().min(1, '供应商必填'),
  productId: z.string().min(1, '商品必填'),
  unit: z.string().optional().nullable(),
  quantity: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  totalAmount: z.number().positive('总金额必须大于0'),
  purchaseDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  inputMethod: z.enum(['manual']).default('manual'),
  memo: z.string().optional().nullable(),
});

export const purchaseUpdateSchema = z.object({
  supplierId: z.string().min(1, '供应商必填').optional(),
  productId: z.string().min(1, '商品必填').optional(),
  unit: z.string().optional().nullable(),
  quantity: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  totalAmount: z.number().positive('总金额必须大于0').optional(),
  purchaseDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效').optional(),
  memo: z.string().optional().nullable(),
});

// ========== 支出记录 ==========
export const expenseSchema = z.object({
  category: z.string().min(1, '支出类别必填').max(50),
  amount: z.number().positive('金额必须大于0'),
  expenseDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  description: z.string().optional().nullable(),
});

export const expenseUpdateSchema = z.object({
  category: z.string().min(1, '支出类别必填').max(50).optional(),
  amount: z.number().positive('金额必须大于0').optional(),
  expenseDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效').optional(),
  description: z.string().optional().nullable(),
});

// ========== 员工 ==========
export const employeeSchema = z.object({
  name: z.string().min(1, '姓名必填').max(50),
  idCardNumber: z.string().max(18).optional().nullable().default(''),
  bankCardNumber: z.string().max(30).optional().nullable().default(''),
  phone: z.string().min(10, '电话号码格式不正确').max(20),
  baseSalary: z.number().positive('基本工资必须大于0'),
  scheduledPayDay: z.number().int().min(1).max(31),
  position: z.enum(['chef', 'waiter', 'cashier', 'cleaner', 'manager']),
  hireDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  remark: z.string().optional().nullable(),
});

// ========== 工资记录 ==========
export const salaryRecordSchema = z.object({
  employeeId: z.string().uuid('员工ID无效'),
  periodStart: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  periodEnd: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  bonus: z.number().min(0).default(0),
  deduction: z.number().min(0).default(0),
  attendanceStatus: z.object({
    absentDays: z.number().min(0).default(0),
    fullAttendanceBonus: z.number().min(0).default(0),
  }),
  actualPayDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效').optional().nullable(),
  memo: z.string().optional().nullable(),
});

export const salaryUpdateSchema = z.object({
  bonus: z.number().min(0).optional(),
  deduction: z.number().min(0).optional(),
  attendanceStatus: z.object({
    absentDays: z.number().min(0).default(0),
    fullAttendanceBonus: z.number().min(0).default(0),
  }).optional(),
  actualPayDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效').optional().nullable(),
  memo: z.string().optional().nullable(),
});

export const salaryBatchSchema = z.object({
  periodStart: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  periodEnd: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
});

// ========== 收入渠道 ==========
export const revenueChannelSchema = z.object({
  name: z.string().min(1, '渠道名称必填').max(50),
  sortOrder: z.number().int().default(0),
});

// ========== 每日收入 ==========
export const dailyRevenueSchema = z.object({
  channelId: z.string().uuid('渠道ID无效'),
  amount: z.number().positive('金额必须大于0'),
  revenueDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  memo: z.string().optional().nullable(),
});

export const dailyRevenueBatchSchema = z.object({
  revenueDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  items: z.array(z.object({
    channelId: z.string().uuid('渠道ID无效'),
    amount: z.number().min(0, '金额不能为负'),
  })).min(1, '至少需要一项收入数据'),
});

export const dailyRevenueUpdateSchema = z.object({
  channelId: z.string().uuid('渠道ID无效').optional(),
  amount: z.number().positive('金额必须大于0').optional(),
  revenueDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效').optional(),
  memo: z.string().optional().nullable(),
});

// ========== 报表查询 ==========
export const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter']).optional().default('day'),
  supplierId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  category: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),
});

export const briefingGenerateSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  periodStart: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  periodEnd: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
});
