import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import supplierRoutes from './routes/suppliers';
import productRoutes from './routes/products';
import purchaseRoutes from './routes/purchases';
import expenseRoutes from './routes/expenses';
import employeeRoutes from './routes/employees';
import salaryRoutes from './routes/salaries';
import revenueRoutes from './routes/revenue';
import reportRoutes from './routes/reports';
import briefingRoutes from './routes/briefing';

const app = express();

// 全局中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: '请求过于频繁，请稍后再试' },
});
app.use(limiter);

// 登录接口单独限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: '登录尝试过于频繁，请15分钟后再试' },
});

// 路由
app.use('/api/v1/auth', loginLimiter);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/purchases', purchaseRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/salaries', salaryRoutes);
app.use('/api/v1', revenueRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/briefing', briefingRoutes);

// 健康检查
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`API docs: http://localhost:${config.port}/api/v1/health`);
});

export default app;
