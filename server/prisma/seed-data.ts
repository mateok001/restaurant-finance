import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('=== Generating test transaction data ===\n');

  // Resolve existing entities
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) throw new Error('Run seed.ts first to create admin user');

  const channels = await prisma.revenueChannel.findMany();
  const suppliers = await prisma.supplier.findMany();
  const products = await prisma.product.findMany();
  const employees = await prisma.employee.findMany();

  if (channels.length === 0 || suppliers.length === 0 || products.length === 0 || employees.length === 0) {
    throw new Error('Run seed.ts first to create base entities');
  }

  // Clear existing transaction data
  await prisma.expense.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.dailyRevenue.deleteMany();
  await prisma.salaryRecord.deleteMany();
  console.log('Cleared existing transactions');

  // ============================================================
  // 1. Generate Daily Revenues (last 90 days)
  // ============================================================
  console.log('Generating daily revenues...');
  const channelWeights: Record<string, { baseMin: number; baseMax: number }> = {
    '一楼堂食': { baseMin: 2000, baseMax: 5000 },
    '二楼包间': { baseMin: 1500, baseMax: 4000 },
    '美团外卖': { baseMin: 800, baseMax: 2500 },
    '淘宝闪购': { baseMin: 300, baseMax: 1200 },
  };

  const revenueCounts: number[] = [];
  for (let d = 90; d >= 1; d--) {
    const date = daysAgo(d);
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const multiplier = isWeekend ? 1.3 + Math.random() * 0.4 : 0.8 + Math.random() * 0.4;

    let dayCount = 0;
    for (const ch of channels) {
      const w = channelWeights[ch.name] || { baseMin: 500, baseMax: 1500 };
      const amount = randFloat(w.baseMin * multiplier, w.baseMax * multiplier);
      await prisma.dailyRevenue.create({
        data: {
          channelId: ch.id,
          amount,
          revenueDate: date,
          recordedBy: admin.id,
        },
      });
      dayCount++;
    }
    revenueCounts.push(dayCount);
  }
  console.log(`  Created ${revenueCounts.reduce((a, b) => a + b, 0)} daily revenue records`);

  // ============================================================
  // 2. Generate Purchases (last 90 days)
  // ============================================================
  console.log('Generating purchases...');
  let purchaseCount = 0;
  for (let d = 90; d >= 1; d--) {
    const date = daysAgo(d);
    // 1-3 purchases per day
    const numPurchases = rand(1, 3);
    for (let i = 0; i < numPurchases; i++) {
      const product = randomPick(products);
      const supplier = suppliers.find(s => s.id === product.supplierId) || randomPick(suppliers);
      const quantity = randFloat(5, 50);
      const unitPrice = randFloat(2, (product.defaultPrice || 30) * 1.2);
      const totalAmount = parseFloat((quantity * unitPrice).toFixed(2));

      // Add some time-of-day variation to purchaseDate
      const purchaseDateTime = new Date(date);
      purchaseDateTime.setHours(rand(7, 18), rand(0, 59));

      await prisma.purchase.create({
        data: {
          supplierId: supplier.id,
          productId: product.id,
          quantity,
          unitPrice,
          totalAmount,
          purchaseDate: purchaseDateTime,
          recordedBy: admin.id,
          inputMethod: randomPick(['manual', 'manual', 'manual', 'voice', 'ocr']),
          memo: Math.random() > 0.7 ? '早市采购' : null,
        },
      });
      purchaseCount++;
    }
  }
  console.log(`  Created ${purchaseCount} purchase records`);

  // ============================================================
  // 3. Generate Expenses (non-salary, last 90 days)
  // ============================================================
  console.log('Generating expenses...');
  const expenseTemplates = [
    { category: 'rent', amount: 8000, desc: '月租', freq: 'monthly' },
    { category: 'utilities', amount: 1200, desc: '水电费', freq: 'monthly' },
    { category: 'gas', amount: 400, desc: '燃气费', freq: 'monthly' },
    { category: 'maintenance', amount: 200, desc: '设备维修', freq: 'random' },
  ];

  let expenseCount = 0;
  for (let d = 90; d >= 1; d--) {
    const date = daysAgo(d);
    const dayOfMonth = date.getDate();

    // Monthly expenses on the 5th
    if (dayOfMonth === 5) {
      for (const tpl of expenseTemplates.filter(t => t.freq === 'monthly')) {
        const variation = 0.85 + Math.random() * 0.3;
        await prisma.expense.create({
          data: {
            category: tpl.category,
            amount: parseFloat((tpl.amount * variation).toFixed(2)),
            expenseDate: date,
            recordedBy: admin.id,
            description: tpl.desc,
          },
        });
        expenseCount++;
      }
    }

    // Random maintenance expenses
    if (Math.random() < 0.15) {
      const tpl = expenseTemplates.find(t => t.category === 'maintenance')!;
      await prisma.expense.create({
        data: {
          category: 'maintenance',
          amount: randFloat(50, 600),
          expenseDate: date,
          recordedBy: admin.id,
          description: randomPick(['更换水龙头', '修理冰箱', '疏通下水道', '更换灯管', '空调维修']),
        },
      });
      expenseCount++;
    }

    // Occasional "other" expenses
    if (Math.random() < 0.08) {
      await prisma.expense.create({
        data: {
          category: 'other',
          amount: randFloat(20, 300),
          expenseDate: date,
          recordedBy: admin.id,
          description: randomPick(['清洁用品', '办公用品', '员工餐费', '一次性餐具']),
        },
      });
      expenseCount++;
    }
  }
  console.log(`  Created ${expenseCount} expense records`);

  // ============================================================
  // 4. Generate Salary Records (last 3 months, per employee)
  // ============================================================
  console.log('Generating salary records...');
  let salaryCount = 0;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  for (const emp of employees) {
    // Generate for the last 3 months (including current)
    for (let m = 0; m < 3; m++) {
      const monthOffset = 2 - m; // 2 months ago, 1 month ago, current
      const targetMonth = currentMonth - monthOffset;
      let year = currentYear;
      let month = targetMonth;
      if (month <= 0) {
        month += 12;
        year -= 1;
      }

      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0); // last day of month
      const hireDate = new Date(emp.hireDate);

      // Attendance: most months have 0 absent days, occasionally 1-2
      const absentDays = Math.random() < 0.75 ? 0 : rand(1, 2);
      const fullAttendanceBonus = absentDays === 0 && Math.random() < 0.8 ? rand(200, 500) : 0;
      const bonus = Math.random() < 0.4 ? rand(100, 800) : 0;
      const deduction = Math.random() < 0.15 ? rand(50, 200) : 0;

      const adjustment = emp.baseSalary / 30 * (2 - absentDays);
      const actualFullBonus = absentDays === 0 ? fullAttendanceBonus : 0;
      const netSalary = Math.round((emp.baseSalary + adjustment + actualFullBonus + bonus - deduction) * 100) / 100;

      // Current month is pending, past months are paid
      const isPaid = m < 2; // first two are paid, current is pending
      const actualPayDate = isPaid ? new Date(year, month - 1, emp.scheduledPayDay + 1) : null;

      const record = await prisma.salaryRecord.create({
        data: {
          employeeId: emp.id,
          periodStart,
          periodEnd,
          baseSalary: emp.baseSalary,
          bonus,
          deduction,
          attendanceStatus: JSON.stringify({ absentDays, fullAttendanceBonus }),
          grossSalary: netSalary,
          netSalary,
          hireDate,
          actualPayDate,
          payStatus: isPaid ? 'paid' : 'pending',
          recordedBy: admin.id,
          memo: absentDays > 0 ? `缺勤${absentDays}天` : null,
        },
      });
      salaryCount++;

      // Auto-create expense for paid records
      if (isPaid) {
        await prisma.expense.create({
          data: {
            category: 'salary',
            amount: netSalary,
            expenseDate: actualPayDate!,
            recordedBy: admin.id,
            description: `${emp.name} ${periodStart.toISOString().slice(0, 10)}~${periodEnd.toISOString().slice(0, 10)} 工资`,
            salaryRecordId: record.id,
          },
        });
      }
    }
  }
  console.log(`  Created ${salaryCount} salary records`);

  // ============================================================
  // Summary
  // ============================================================
  console.log('\n=== Test data generation complete ===');
  const totalRevenue = await prisma.dailyRevenue.aggregate({ _sum: { amount: true } });
  const totalPurchases = await prisma.purchase.aggregate({ _sum: { totalAmount: true } });
  const totalExpenses = await prisma.expense.aggregate({ _sum: { amount: true } });
  const totalSalary = await prisma.salaryRecord.aggregate({ _sum: { netSalary: true } });

  console.log(`Total revenue: ¥${totalRevenue._sum.amount?.toLocaleString() || '0'}`);
  console.log(`Total purchases: ¥${totalPurchases._sum.totalAmount?.toLocaleString() || '0'}`);
  console.log(`Total expenses: ¥${totalExpenses._sum.amount?.toLocaleString() || '0'}`);
  console.log(`Total salary: ¥${totalSalary._sum.netSalary?.toLocaleString() || '0'}`);

  const recordCounts = {
    revenues: await prisma.dailyRevenue.count(),
    purchases: await prisma.purchase.count(),
    expenses: await prisma.expense.count(),
    salaries: await prisma.salaryRecord.count(),
  };
  console.log(`\nRecord counts:`, recordCounts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
