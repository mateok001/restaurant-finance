# Debug Log: 工资记录创建后在月份筛选视图中不显示

**日期**: 2026-05-28
**重现次数**: 2 次
**影响范围**: 工资管理页面 — 月份筛选功能

## 症状

在工资管理页面筛选某月份后，新增一条工资记录（实发工资日期在该月份内），创建成功后记录不在当前筛选视图中显示。刷新后也不显示。

## 复现步骤

1. 工资管理页面，筛选 `2026年2月`
2. 新增工资记录：员工=张士明，周期=2026-01-15~2026-02-15，实发工资日期=2026-02-16
3. 创建成功，但列表中不显示该记录

## 根因

月份筛选的查询参数 `hireDateStart` / `hireDateEnd` 传给后端，后端用 `hire_date` 列进行过滤。

```typescript
// salary.service.ts (错误版本)
if (filters?.hireDateStart) where.hireDate = { gte: new Date(filters.hireDateStart) };
if (filters?.hireDateEnd) where.hireDate = { ...where.hireDate, lte: new Date(filters.hireDateEnd) };
```

但 `hire_date` 存储的是员工的**永久入职日期**（从 `employees.hire_date` 复制），而不是工资发放日期。创建记录时：

```typescript
// salary.service.ts create()
hireDate: new Date(employee.hireDate), // 员工的入职日期，如 2024-03-15
```

员工的实际入职日期（如 2024-03-15）不在筛选月份（2026-02）范围内，因此被 WHERE 条件排除。

**数据流追踪**：

```
前端 fetchData → params.hireDateStart="2026-02-01", hireDateEnd="2026-02-28"
  → GET /salaries?hireDateStart=2026-02-01&hireDateEnd=2026-02-28
    → service.list() → WHERE hire_date BETWEEN '2026-02-01' AND '2026-02-28'
      → 张士明 hire_date = 2024-03-15 → 不匹配 → 被排除
```

## 修复

### 1. 后端 service `salary.service.ts` — 筛选字段改为 `actualPayDate`

```typescript
if (filters?.payDateStart || filters?.payDateEnd) {
  const dateFilter: any = {};
  if (filters?.payDateStart) dateFilter.gte = new Date(filters.payDateStart);
  if (filters?.payDateEnd) dateFilter.lte = new Date(filters.payDateEnd);
  // actualPayDate 已设置时用它筛选；未设置（待发放）时回退到 periodEnd
  where.OR = [
    { actualPayDate: dateFilter },
    { actualPayDate: null, periodEnd: dateFilter },
  ];
}
```

### 2. 后端路由 `routes/salaries.ts` — 参数名从 `hireDateStart/End` 改为 `payDateStart/End`

### 3. 前端 `web/src/pages/Salaries.tsx` — `fetchData` 参数名同步修改

```typescript
params.payDateStart = dayjs(...).format('YYYY-MM-DD');
params.payDateEnd = dayjs(...).format('YYYY-MM-DD');
```

## 涉及的数据库字段

| 字段 | 含义 | 来源 |
|------|------|------|
| `hire_date` | 员工入职日期 | 从 `employees.hire_date` 复制，固定不变 |
| `actual_pay_date` | 实发工资日期 | 用户创建时手动填写，或标记"已发放"时自动设为当天 |
| `period_start` / `period_end` | 工资周期 | 用户创建时填写 |

## 关键教训

- `hire_date`（入职日期）和 `actual_pay_date`（实发日期）是完全不同的概念
- 筛选"某月工资"时，用户关心的是**发放日期**，不是入职日期
- 待发放记录没有 `actual_pay_date`，需要用 `period_end` 作为回退值

## 验证方法

1. 筛选 `2026年2月`
2. 新增记录：实发工资日期 = 2026-02-16
3. 创建成功后应立即出现在列表中
4. 筛选 `2026年3月` 时该记录不应出现

---

## 补充修复 1: 点击"发放"后记录从筛选视图消失

**日期**: 2026-05-28
**关联**: 上述 Bug #1 的连锁问题

### 症状

在上面的 Bug 修复后，待发放记录能正常在月份筛选中显示。但点击"发放"标记为已发放后，该记录立即从当前月份筛选视图中消失。

### 复现步骤

1. 筛选 `2026年2月`，张士明的记录正常显示（实发工资日期=2026-02-16，状态=待发放）
2. 点击"发放"，状态变为"已发放"
3. 记录从列表中消失

### 根因

`markAsPaid` 无条件将 `actualPayDate` 覆盖为 `new Date()`（当天日期 2026-05-28）：

```typescript
// salary.service.ts markAsPaid() — 错误版本
data: {
  payStatus: 'paid',
  actualPayDate: new Date(),  // 覆盖为今天 2026-05-28
},
```

记录原本 `actualPayDate = 2026-02-16`，被改成 `2026-05-28` 后，不再匹配2月的筛选条件。

### 修复

```typescript
// 修复后：已有日期则保留，没有才用今天
actualPayDate: record.actualPayDate || new Date(),
```

### 关键教训

`markAsPaid` 覆盖 `actualPayDate` 会破坏用户原始录入的发放日期。只有在记录原本没有填写实发日期时，才应自动设为当天。

---

## 补充修复 2: 同员工同月重复工资记录校验

**日期**: 2026-05-28

### 需求

每月每名员工只应有一条工资记录。需要在新增和编辑时阻止同员工同月的重复记录。

### 实现

在 `salary.service.ts` 新增 `checkDuplicateInMonth` 函数，使用与筛选一致的"生效发放日期"逻辑（`actualPayDate ?? periodEnd`）确定所属月份：

```typescript
function getMonthRange(dateStr: string): { monthStart: Date; monthEnd: Date } {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();
  return {
    monthStart: new Date(year, month, 1),
    monthEnd: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

async function checkDuplicateInMonth(employeeId: string, payDateStr: string, excludeId?: string) {
  const { monthStart, monthEnd } = getMonthRange(payDateStr);
  const where: any = {
    employeeId,
    id: excludeId ? { not: excludeId } : undefined,
    OR: [
      { actualPayDate: { gte: monthStart, lte: monthEnd } },
      { actualPayDate: null, periodEnd: { gte: monthStart, lte: monthEnd } },
    ],
  };
  const existing = await prisma.salaryRecord.findFirst({ where, include: { employee: { select: { name: true } } } });
  if (existing) {
    const monthLabel = `${monthStart.getFullYear()}年${monthStart.getMonth() + 1}月`;
    throw new AppError(409, `${existing.employee.name} 在${monthLabel}已有工资记录，不可重复添加`);
  }
}
```

**两处调用**：
| 位置 | 触发条件 |
|------|----------|
| `create` | 新增时始终校验 |
| `update` | 仅当 `actualPayDate` 被修改时校验，排除自身 ID |

### 关键教训

- 校验逻辑必须和筛选逻辑使用相同的"所属月份"判定规则（`actualPayDate ?? periodEnd`）
- `update` 校验必须传入 `excludeId`，否则编辑已有记录时会和自己冲突
