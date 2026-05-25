import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 创建默认管理员
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      displayName: '管理员',
      role: 'admin',
    },
  });
  console.log('Admin user created:', admin.username);

  // 创建合伙人账号
  const partnerHash = await bcrypt.hash('partner123', 12);
  await prisma.user.upsert({
    where: { username: 'partner' },
    update: {},
    create: {
      username: 'partner',
      passwordHash: partnerHash,
      displayName: '合伙人',
      role: 'partner',
    },
  });
  console.log('Partner user created');

  // 创建默认收入渠道
  const defaultChannels = [
    { name: '一楼堂食', sortOrder: 1 },
    { name: '二楼包间', sortOrder: 2 },
    { name: '美团外卖', sortOrder: 3 },
    { name: '淘宝闪购', sortOrder: 4 },
  ];

  for (const ch of defaultChannels) {
    const existing = await prisma.revenueChannel.findFirst({ where: { name: ch.name } });
    if (!existing) {
      await prisma.revenueChannel.create({
        data: {
          name: ch.name,
          isDefault: true,
          sortOrder: ch.sortOrder,
        },
      });
    }
  }
  console.log('Default revenue channels created');

  // 创建示例供应商
  const supplierData = [
    { name: '老王菜铺', contactPhone: '13800001001', contactPerson: '王师傅' },
    { name: '张记肉铺', contactPhone: '13800001002', contactPerson: '张老板' },
    { name: '海鲜批发市场', contactPhone: '13800001003' },
  ];
  for (const s of supplierData) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.supplier.create({ data: s });
    }
  }
  console.log('Sample suppliers created');

  // 创建示例商品
  const suppliers = await prisma.supplier.findMany();
  if (suppliers.length > 0) {
    const productData = [
      { name: '土豆', category: 'ingredients', unit: '斤', supplierId: suppliers[0].id },
      { name: '白菜', category: 'ingredients', unit: '斤', supplierId: suppliers[0].id },
      { name: '五花肉', category: 'ingredients', unit: '斤', supplierId: suppliers[1].id },
      { name: '排骨', category: 'ingredients', unit: '斤', supplierId: suppliers[1].id },
      { name: '基围虾', category: 'ingredients', unit: '斤', supplierId: suppliers[2].id },
      { name: '金龙鱼食用油', category: 'seasonings', unit: '桶', supplierId: suppliers[0].id },
      { name: '青岛啤酒', category: 'beverages', unit: '箱', supplierId: suppliers[0].id },
    ];
    for (const p of productData) {
      const existing = await prisma.product.findFirst({ where: { name: p.name } });
      if (!existing) {
        await prisma.product.create({ data: p });
      }
    }
    console.log('Sample products created');
  }

  // 创建示例员工
  const employeeData = [
    {
      name: '李明', idCardNumber: '320123199001011234', bankCardNumber: '6222021234567890123',
      phone: '13900001001', baseSalary: 6000, scheduledPayDay: 15,
      position: 'chef', hireDate: new Date('2024-01-15'),
    },
    {
      name: '王芳', idCardNumber: '320123199502022345', bankCardNumber: '6222021234567890456',
      phone: '13900001002', baseSalary: 4500, scheduledPayDay: 15,
      position: 'waiter', hireDate: new Date('2024-03-01'),
    },
    {
      name: '赵强', idCardNumber: '320123198803033456', bankCardNumber: '6222021234567890789',
      phone: '13900001003', baseSalary: 5000, scheduledPayDay: 15,
      position: 'manager', hireDate: new Date('2024-01-01'),
    },
  ];
  for (const e of employeeData) {
    const existing = await prisma.employee.findFirst({ where: { name: e.name } });
    if (!existing) {
      await prisma.employee.create({ data: e });
    }
  }
  console.log('Sample employees created');

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
