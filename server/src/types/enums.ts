// SQLite doesn't support native enums via Prisma.
// These constants replace the @prisma/client enum imports.

export const Role = {
  admin: 'admin',
  partner: 'partner',
  staff: 'staff',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ProductCategory = {
  ingredients: 'ingredients',
  beverages: 'beverages',
  seasonings: 'seasonings',
  packaging: 'packaging',
  other: 'other',
} as const;
export type ProductCategory = (typeof ProductCategory)[keyof typeof ProductCategory];

export const InputMethod = {
  manual: 'manual',
  voice: 'voice',
  ocr: 'ocr',
} as const;
export type InputMethod = (typeof InputMethod)[keyof typeof InputMethod];

export const ExpenseCategory = {
  salary: 'salary',
  rent: 'rent',
  utilities: 'utilities',
  gas: 'gas',
  maintenance: 'maintenance',
  other: 'other',
} as const;
export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const EmployeePosition = {
  chef: 'chef',
  waiter: 'waiter',
  cashier: 'cashier',
  cleaner: 'cleaner',
  manager: 'manager',
} as const;
export type EmployeePosition = (typeof EmployeePosition)[keyof typeof EmployeePosition];

export const PayStatus = {
  pending: 'pending',
  paid: 'paid',
} as const;
export type PayStatus = (typeof PayStatus)[keyof typeof PayStatus];

export const ReportType = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  quarterly: 'quarterly',
} as const;
export type ReportType = (typeof ReportType)[keyof typeof ReportType];
