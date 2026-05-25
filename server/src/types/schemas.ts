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
  unit: z.string().min(1).max(20),
  defaultPrice: z.number().positive('价格必须大于0').optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
});

// ========== 采购记录 ==========
export const purchaseSchema = z.object({
  supplierId: z.string().uuid('供应商ID无效'),
  productId: z.string().uuid('商品ID无效'),
  quantity: z.number().positive('数量必须大于0'),
  unitPrice: z.number().positive('单价必须大于0'),
  totalAmount: z.number().positive('总金额必须大于0'),
  purchaseDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  inputMethod: z.enum(['manual', 'voice', 'ocr']).default('manual'),
  memo: z.string().optional().nullable(),
});

export const purchaseVoiceSchema = z.object({
  audioData: z.string().min(1, '音频数据不能为空'),
});

export const purchaseOcrSchema = z.object({
  imageData: z.string().min(1, '图片数据不能为空'),
});

// ========== 支出记录 ==========
export const expenseSchema = z.object({
  category: z.enum(['salary', 'rent', 'utilities', 'gas', 'maintenance', 'other']),
  amount: z.number().positive('金额必须大于0'),
  expenseDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  description: z.string().optional().nullable(),
});

// ========== 员工 ==========
export const employeeSchema = z.object({
  name: z.string().min(1, '姓名必填').max(50),
  idCardNumber: z.string().min(15, '身份证号格式不正确').max(18),
  bankCardNumber: z.string().min(16, '银行卡号格式不正确').max(30),
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
    fullAttendance: z.boolean().default(true),
    workDays: z.number().int().min(0).default(0),
    lateDays: z.number().int().min(0).default(0),
    absentDays: z.number().int().min(0).default(0),
    leaveDays: z.number().int().min(0).default(0),
  }),
  scheduledPayDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  memo: z.string().optional().nullable(),
});

export const salaryBatchSchema = z.object({
  periodStart: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  periodEnd: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
  scheduledPayDate: z.string().refine((d) => !isNaN(Date.parse(d)), '日期格式无效'),
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
