# 代码审查问题跟踪日志

> 审查日期：2026-05-31 | 审查范围：全栈（后端 + 前端 + Schema）

## 问题总览

| 编号 | 类别 | 严重度 | 状态 | 文件 | 简述 |
|------|------|--------|------|------|------|
| B01 | 安全 | CRITICAL | ✅ 已修复 | server/src/config/index.ts:7-8 | JWT 密钥硬编码备用值 |
| B02 | 安全 | HIGH | ✅ 已修复 | server/src/middleware/auth.ts:21 | jwt.verify 缺少 algorithms 白名单 |
| B03 | 功能 | CRITICAL | ✅ 已修复 | web/src/pages/Settings.tsx:17-22 | 管理员用户管理功能完全失效 |
| B04 | 数据 | CRITICAL | ✅ 已修复 | server/prisma/schema.prisma + migrations | Schema 与迁移文件不一致 |
| B05 | 数据 | CRITICAL | ✅ 已修复 | server/prisma/seed.ts:77-88 | seed.ts 引用已删除的 Product 字段 |
| B06 | 数据 | CRITICAL | ✅ 已修复 | server/prisma/seed-data.ts:94,96 | seed-data.ts 引用已删除的 Product 字段 |
| B07 | 权限 | HIGH | ✅ 已修复 | server/src/routes/reports.ts | 所有报表端点缺少角色权限校验 |
| B08 | 权限 | HIGH | ✅ 已修复 | server/src/routes/salaries.ts | 工资报表/详情缺少角色权限校验 |
| B09 | 权限 | HIGH | ✅ 已修复 | server/src/routes/employees.ts:24 | showFull=true 无权限校验 |
| B10 | 权限 | HIGH | ✅ 已修复 | server/src/routes/briefing.ts:11 | 简报列表无角色权限校验 |
| B11 | 可靠性 | HIGH | ✅ 已修复 | server/src/services/auth.service.ts:119-134 | Token 刷新竞态条件(P2025) |
| B12 | 可靠性 | HIGH | ✅ 已修复 | server/src/services/auth.service.ts:130,134 | 刷新会话非原子操作 |
| B13 | 数据 | HIGH | ✅ 已修复 | server/src/services/purchase.service.ts:155-251 | 批量采购写入无事务保护 |
| B14 | 数据 | HIGH | ✅ 已修复 | server/src/services/salary.service.ts:227-265 | markAsPaid/unmarkPaid 无事务保护 |
| B15 | 数据 | HIGH | ✅ 已修复 | server/src/services/briefing.service.ts:38-42 | 月报/周报上一周期计算错误 |
| B16 | 前端 | HIGH | ✅ 已修复 | web/src/services/api.ts:64 | localStorage.clear() 删除所有数据 |
| B17 | 安全 | HIGH | ✅ 已修复 | server/src/routes/purchases.ts,expenses.ts | 文件上传无 fileFilter |
| B18 | 安全 | HIGH | ✅ 已修复 | server/src/services/file.service.ts:43 | MinIO 文件 URL 无签名认证 |
| B19 | 前端 | HIGH | ✅ 已修复 | web/src/pages/*.tsx (15+ 文件) | API 错误静默吞没(.catch(()=>{})) |
| B20 | 安全 | HIGH | ✅ 已修复 | server/src/config/index.ts:18-19 | MinIO 凭据硬编码 |
| B21 | 安全 | MEDIUM | ✅ 已修复 | server/src/index.ts:21-22 | 50MB 请求体限制过大致 DoS 风险 |
| B22 | 安全 | MEDIUM | ✅ 已修复 | server/src/index.ts:20 | CORS 完全开放 |
| B23 | 安全 | MEDIUM | ✅ 已修复 | server/src/routes/auth.ts:86 | 密码修改端点缺少输入验证 |
| B24 | 验证 | MEDIUM | ✅ 已修复 | server/src/routes/purchases.ts,expenses.ts,salaries.ts,revenue.ts | 多个 PUT 端点缺少 Zod 验证 |
| B25 | 验证 | MEDIUM | ✅ 已修复 | server/src/routes/purchases.ts:82-101 | /confirm-parsed items 数组元素未验证 |
| B26 | 验证 | MEDIUM | ✅ 已修复 | server/src/types/schemas.ts:64-66 | 电话/身份证/银行卡验证过于宽松 |
| B27 | 数据 | MEDIUM | ✅ 已修复 | server/src/routes/revenue.ts:108-109 | PUT 展开整个 req.body 可覆盖 recordedBy |
| B28 | 性能 | MEDIUM | ✅ 已修复 | server/prisma/schema.prisma | 缺少数据库索引 |
| B29 | 数据 | MEDIUM | ✅ 已修复 | server/prisma/schema.prisma | 缺少唯一约束(Product.name, Supplier.name) |
| B30 | 数据 | MEDIUM | ✅ 已修复 | server/src/services/auth.service.ts | 过期 session 未清理 |
| B31 | 前端 | MEDIUM | ✅ 已修复 | web/src/pages/OcrInput.tsx,VoiceInput.tsx | API 故障时静默切换到 demo 数据 |
| B32 | 前端 | MEDIUM | ✅ 已修复 | web/src/pages/Login.tsx:18-19 | 未验证 API 响应结构即保存 token |
| B33 | 前端 | MEDIUM | ✅ 已修复 | web/src/pages/App.tsx:22-24 | PrivateRoute 仅检查 token 存在性 |
| B34 | 数据 | MEDIUM | ✅ 已修复 | server/src/services/auth.service.ts:138 | 刷新 token 丢失 remember 设置 |
| B35 | 数据 | MEDIUM | ✅ 已修复 | server/src/services/purchase.service.ts:159 | 供应商/商品匹配用 contains 过于宽泛 |
| B36 | 前端 | MEDIUM | ✅ 已修复 | web/src/pages/RevenueAnalysis.tsx:53-63 | ECharts tooltip HTML 拼接 XSS 风险 |
| B37 | 数据 | LOW | ✅ 已修复 | server/src/services/employee.service.ts:83 | leaveDate 使用系统时间而非 UTC+8 |
| B38 | 数据 | LOW | ✅ 已修复 | server/src/services/expense.service.ts:53 | 日期解析不一致(缺少+08:00) |
| B39 | 数据 | LOW | ✅ 已修复 | server/src/services/purchase.service.ts:186 | 浮点数计算未四舍五入 |
| B40 | 数据 | LOW | ✅ 已修复 | server/src/services/file.service.ts:48-49 | URL 解析含查询参数时失败 |
| B41 | 数据 | LOW | ✅ 已修复 | server/src/services/ocr.service.ts:29 | 硬编码 image/jpeg MIME 类型 |
| B42 | 数据 | LOW | ✅ 已修复 | server/src/services/voice.service.ts:27 | 硬编码 audio/wav MIME 类型 |
| B43 | 数据 | LOW | ✅ 已修复 | server/src/services/report.service.ts:3,46 | groupBy 参数声明但未使用 |
| B44 | 数据 | LOW | ✅ 已修复 | server/src/services/report.service.ts:232-233 | 负基线值产出 null 而非百分比 |
| B45 | 前端 | LOW | ✅ 已修复 | web/src/App.tsx | 缺少 404 回退路由 |
| B46 | 前端 | LOW | ✅ 已修复 | web/src/layouts/MainLayout.tsx | 菜单 key 前缀不一致 |
| B47 | 可靠性 | LOW | ✅ 已修复 | server/src/middleware/errorHandler.ts:43 | Prisma P2003 错误泄露数据库字段名 |
| B48 | 前端 | HIGH | ✅ 已修复 | web/src/pages/Revenue.tsx:273-275 | 收入页分页器pageSize切换无效 |
| B49 | 数据 | HIGH | ✅ 已修复 | server/src/services/salary.service.ts:244 | 工资支出expenseDate未使用实发日期 |

---

## 功能新增

### F01 — 批量记录收入功能
**日期**: 2026-06-04
**文件**: `server/src/routes/revenue.ts`, `server/src/types/schemas.ts`, `web/src/pages/Revenue.tsx`
**描述**: 在收入管理页新增"批量记录收入"按钮，打开表单后可选择日期并为每个收入渠道填入金额（非必填），提交时自动过滤金额为0的渠道，仅录入有效数据（0~4条）。
**后端**: 新增 `POST /api/v1/daily-revenue/batch` 接口，接收 `{ revenueDate, items: [{ channelId, amount }] }`，自动过滤 `amount > 0` 的项批量创建。
**前端**: 新增 `batchModalOpen`/`batchForm` 状态，Modal 按渠道动态渲染 InputNumber 字段。

### F02 — 移除语音记账 & 拍照记账模块
**日期**: 2026-06-04
**描述**: 用户决定暂时不需要语音记账和拍照记账功能，从全栈移除相关模块。
**删除的文件**: `server/src/services/voice.service.ts`, `server/src/services/ocr.service.ts`, `web/src/pages/VoiceInput.tsx`, `web/src/pages/OcrInput.tsx`
**后端修改**: 移除 `/voice`、`/ocr`、`/confirm-parsed` 路由；`inputMethod` 枚举简化为仅 `manual`；移除 FunASR/PaddleOCR 配置
**前端修改**: 移除 Voice/Ocr 页面路由和菜单项；仪表盘快捷入口替换为"记录收入"；`inputMethod` 映射简化为仅"手动"
**配置修改**: `docker-compose.yml` 移除 FunASR/PaddleOCR 服务；`.env.example` 移除相关环境变量

---

## 修复详情

### B01 — JWT 密钥硬编码 [CRITICAL]
**文件**: `server/src/config/index.ts:7-8`
**问题**: JWT 后备密钥 `'dev-access-secret'` / `'dev-refresh-secret'` 写死在源码中
**修复**: 生产环境未设置环境变量时启动报错，拒绝使用默认密钥

### B02 — JWT 算法白名单缺失 [HIGH]
**文件**: `server/src/middleware/auth.ts:21`
**问题**: `jwt.verify` 未指定 `algorithms`，可能接受 `alg:'none'` 攻击
**修复**: 添加 `{ algorithms: ['HS256'] }` 选项

### B03 — 管理员用户管理功能失效 [CRITICAL]
**文件**: `web/src/pages/Settings.tsx:17-22`
**问题**: `fetchUsers` 函数不调用 API，管理员无法查看/管理用户
**修复**: 调用 `/api/v1/users` API 获取用户列表

### B04 — Schema/迁移文件不一致 [CRITICAL]
**文件**: `server/prisma/`
**问题**: 初始迁移包含 `unit`/`default_price`/`supplier_id` 在 products 表，但 schema 已移除这些字段
**修复**: 重写初始迁移以匹配当前 schema；合并 scheduled_pay_date→hire_date 重命名

### B05-B06 — Seed 文件引用已删除字段 [CRITICAL]
**文件**: `server/prisma/seed.ts:77-88`, `server/prisma/seed-data.ts:94,96`
**问题**: 引用 `product.unit`、`product.supplierId`、`product.defaultPrice` 不存在
**修复**: 更新 seed 数据以匹配当前 Product 模型结构

### B07-B10 — 报表/工资/员工/简报端点权限缺失 [HIGH]
**文件**: `server/src/routes/reports.ts`, `salaries.ts`, `employees.ts`, `briefing.ts`
**问题**: 财务敏感端点只用 `authenticate`，`staff` 角色可查看所有数据
**修复**: 添加 `requireAdminOrPartner` 中间件到所有只读端点

### B11-B12 — Token 刷新竞态条件 [HIGH]
**文件**: `server/src/services/auth.service.ts:119-134`
**问题**: 并发刷新同一 token 时 P2025 错误；删除/创建非原子
**修复**: 使用 `deleteMany` 替代 `delete`；包装在 `$transaction` 中

### B13 — 批量采购写入无事务 [HIGH]
**文件**: `server/src/services/purchase.service.ts:155-251`
**问题**: createFromVoice/createFromOcr 循环创建无事务，部分失败产生孤立数据
**修复**: 包装在 `prisma.$transaction` 中

### B14 — 工资发放状态变更无事务 [HIGH]
**文件**: `server/src/services/salary.service.ts:227-265`
**问题**: markAsPaid/unmarkPaid 的 update+insert/delete 不在事务中
**修复**: 包装在 `prisma.$transaction` 中

### B15 — 简报周期计算错误 [HIGH]
**文件**: `server/src/services/briefing.service.ts:38-42`
**问题**: 用天数相减计算"上一周期"，月报/周报同比数据错位
**修复**: 使用自然月/周边界计算上一周期

### B16 — localStorage.clear() 过度清理 [HIGH]
**文件**: `web/src/services/api.ts:64`
**问题**: 刷新失败时清空所有 localStorage 数据
**修复**: 仅删除 auth 相关的 token 键

### B17 — 文件上传无类型过滤 [HIGH]
**文件**: `server/src/routes/purchases.ts`, `expenses.ts`
**问题**: Multer 配置无 `fileFilter`，接受任意文件类型
**修复**: 添加文件类型白名单

### B18 — MinIO URL 无签名 [HIGH]
**文件**: `server/src/services/file.service.ts:43`
**问题**: 返回公开直接 URL，无签名/过期机制
**修复**: 使用 `presignedGetObject` 生成带签名的临时 URL

### B19 — 前端全局静默吞错误 [HIGH]
**文件**: `web/src/pages/*.tsx` (15+ 文件)
**问题**: `.catch(() => {})` 完全静默所有 API 错误
**修复**: 添加 `message.error()` 用户提示

### B20 — MinIO 凭据硬编码 [HIGH]
**文件**: `server/src/config/index.ts:18-19`
**问题**: MinIO 后备凭据 `minioadmin/minioadmin` 为公开默认值
**修复**: 生产环境未设置时警告并使用随机生成的凭据

### B48 — 收入页分页器切换无效 [HIGH]
**文件**: `web/src/pages/Revenue.tsx`
**问题**: Table 的 `pagination.pageSize` 硬编码为 30，无 `onChange` 回调，用户选择 50/100 条后表格恢复为 30 条
**修复**: 添加 `pageSize` 状态 (`useState(30)`)，通过 Table 的 `onChange` 回调联动更新 `pagination.pageSize`

### B49 — 工资支出expenseDate未使用实发日期 [HIGH]
**文件**: `server/src/services/salary.service.ts:244`
**问题**: `markAsPaid` 创建关联 Expense 时 `expenseDate` 写死为 `new Date()`，导致实发日期在5月的工资支出记录错误显示在6月
**修复**: 改为 `record.actualPayDate || new Date()`，同时修复 15 条历史数据

---

## 统计

| 严重度 | 总数 | 已修复 |
|--------|------|--------|
| CRITICAL | 6 | 6 |
| HIGH | 16 | 16 |
| MEDIUM | 17 | 17 |
| LOW | 10 | 10 |
| **合计** | **49** | **49** |

> 注：B_skip_1 (工资公式) 和 B_skip_2 (工资列表 PII 脱敏) 经用户确认无需修改，未列入上表。

*最后更新: 2026-06-04*
