# 变更日志

## 2026-06-04

### 微信小程序 Phase 10 — 原生 JS 开发完成
- **技术路线变更**：从 Taro 3.x + React + TypeScript 改为**原生 JavaScript**（遵循 `wechat-miniprogram-skill` 规范）
  - 原因：原生 JS 包体积最小、无框架运行时开销、直接调用 `wx.*` API、无需编译步骤
- **新增文件 35 个**：
  - `miniapp/project.config.json` — 小程序项目配置（AppID: wx65428bf1fff2cb38）
  - `miniapp/app.js` — 全局入口，登录状态检查 + 自动恢复
  - `miniapp/app.json` — 4 个 Tab 页面路由（首页/记账/报表/我的）
  - `miniapp/app.wxss` — 全局样式，CSS 变量（主色 #D4A574）
  - `miniapp/services/api.js` — HTTP 封装：自动 Bearer Token + 401 自动刷新 + 请求重试队列
  - `miniapp/utils/auth.js` — Token/用户信息读写（wx.Storage 替代 localStorage）
  - `miniapp/utils/util.js` — 工具函数（日期格式化、金额千分位、Toast/Modal 封装）
  - `miniapp/pages/login/` — 登录页：用户名密码登录 → JWT 双 Token 存储 → 自动跳转
  - `miniapp/pages/dashboard/` — 仪表盘：今日收入大字卡 + 本月收入/采购/支出/净利润 KPI + 快捷入口 + 最近记录
  - `miniapp/pages/entry/` — 记账页（三 Tab）：
    - 收入录入：按渠道批量录入金额 + 日期选择 + 批量提交
    - 采购录入：供应商/商品名称输入（后端自动查找或创建）+ 数量/单位/单价/总价联动 + 备注
    - 支出录入：类别标签快捷选择 + 金额 + 说明
  - `miniapp/pages/report/` — 报表页：今日/7天/本月/自定义日期切换 + KPI 四宫格（收入/采购/支出/净利润）+ 每日净利润柱状图
  - `miniapp/pages/profile/` — 个人中心：用户信息展示 + 服务器地址 + 退出登录
  - `miniapp/images/` — 8 个 Tab 图标占位 PNG（81×81，后续需替换为正式图标）
- **设计原则**：移动端聚焦"快速录入"，复杂报表和员工管理留到 Web 桌面端
- **API 兼容性**：复用全部现有后端 REST API（零后端改动）
  - 采购录入传供应商/商品名称字符串 → `resolveSupplier`/`resolveProduct` 自动处理
  - 收入批量录入 → `POST /api/v1/daily-revenue/batch`
- **待完成**：
  - 替换 Tab 图标为正式设计稿
  - 配置合法域名（生产环境）
  - 微信审核提交（"工具-记账"类目）

## 2026-05-28

### 报表中心拆分为3个独立页面 + Bug修复
- **文件**: `server/src/routes/reports.ts`, `server/src/services/report.service.ts`, `web/src/pages/ProfitOverview.tsx` (新增), `web/src/pages/ProductPurchaseReport.tsx` (新增), `web/src/pages/SupplierPaymentReport.tsx` (新增), `web/src/utils/download.ts` (新增), `web/src/App.tsx`, `web/src/layouts/MainLayout.tsx`
- 报表中心从单页面3个Tab拆分为3个独立页面：
  - **利润概览** (`/reports/profit`)：日期范围筛选 + 4个汇总卡片 + 收支趋势图 + 收入/支出饼图
  - **商品采购** (`/reports/product`)：日期范围筛选 + 商品名称搜索 + 汇总卡片 + 采购明细表
  - **供应商货款** (`/reports/supplier`)：日期范围筛选 + 供应商名称搜索 + 汇总卡片 + 货款明细表
- **Bug修复**：
  - `getByProduct` 引用已删除的 `product.unit` 字段导致Prisma校验失败 → 改用 `p.unit`（Purchases表字段）
  - `getDateRange` 使用 `new Date("YYYY-MM-DD")` 非UTC+8格式 → 改用 `${date}T00:00:00+08:00` / `${date}T23:59:59+08:00`（影响5个接口）
  - `getTrends` 使用 `.toISOString()` 按UTC日期分组导致日期错位 → 改用 `chinaDateParts()` helper
  - `getSummary` period输出同样用 `.toISOString()` → 改用 `chinaDateParts()`
- 后端 `getByProduct`/`getBySupplier` 新增 `productName`/`supplierName` 搜索参数
- CSV导出函数提取为 `web/src/utils/download.ts` 共享工具
- 删除旧 `Reports.tsx`，侧边栏报表中心改为子菜单，默认展开

### 工资发放页面导出Excel + 删除报表中心工资报表
- **文件**: `web/src/pages/Salaries.tsx`, `web/src/pages/Reports.tsx`, `server/src/services/salary.service.ts`, `web/package.json`
- 工资发放页面新增"导出Excel"按钮，导出当前筛选条件下的数据为 `.xlsx` 文件，仅包含姓名、身份证号、手机号、实发工资金额四列
- 安装 `xlsx` (SheetJS) 依赖
- 后端 salary list API 的 employee select 新增 `phone` 和 `idCardNumber` 字段
- 报表中心删除"工资报表"Tab（工资数据导出已迁移至工资发放页面）

### 修复日期筛选时区错位Bug（UTC+8）
- **文件**: `server/src/routes/revenue.ts`, `server/src/services/report.service.ts`, `server/src/services/purchase.service.ts`, `server/src/services/expense.service.ts`
- 根因：数据库日期字段存储为北京时间午夜（`T16:00:00.000Z`），但此前 `new Date("YYYY-MM-DD")` 解析为 UTC 午夜、`setHours(23,59,59,999)` 基于本地时间，导致按日筛选时数据跨天错位（如 5 月 26 日数据被分入 5 月 25 日窗口）
- 修复：全部日期边界改用 `new Date("${date}T00:00:00+08:00")` / `new Date("${date}T23:59:59+08:00")` 显式指定 UTC+8
- `getRevenueAnalysis` 重构：从逐日 93 次 DB 查询改为 1 次批量拉取 + 内存 UTC+8 分组，查询量减少 99%

### 营业额分析页面 + 每日收入筛选/汇总卡片
- **文件**: `web/src/pages/RevenueAnalysis.tsx` (新增), `web/src/pages/Revenue.tsx`, `server/src/services/report.service.ts`, `server/src/routes/reports.ts`, `server/src/routes/revenue.ts`, `web/src/App.tsx`, `web/src/layouts/MainLayout.tsx`
- 新增营业额分析页面 (`/revenue/analysis`)：年/季度/月/日四档粒度切换；柱状图对比本年 vs 去年；折线图展示同比增长率和环比增长率；顶部汇总卡片（本期总收入、去年同期、同比变化）
- 每日收入页面新增年-月-日三级日期筛选 + 总计收入/记录数汇总卡片（与采购管理逻辑一致）
- 后端新增 `GET /reports/revenue-analysis` 接口，支持 year/granularity/month 参数，返回各期营收及同比/环比数据
- 修复每日收入后端 `endDate` 筛选同一天的 Bug（`setHours(23,59,59,999)`）
- 左侧导航"收入管理"子菜单新增"营业额分析"，默认展开

### 修复采购管理日期筛选Bug + 费用支出添加日期筛选 + 顶部汇总卡片
- **文件**: `server/src/services/purchase.service.ts`, `server/src/services/expense.service.ts`, `web/src/pages/ExpenseManagement.tsx`, `web/src/pages/PurchaseManagement.tsx`
- 修复采购管理日期筛选Bug：后端 `lte` 比较改用 `setHours(23,59,59,999)` 确保包含当天全天数据（此前 `new Date("YYYY-MM-DD")` 只到当天 00:00:00 UTC，可能导致当天记录不匹配）
- 费用支出页面新增年-月日期筛选（无需日级别），默认当年当月
- 采购管理和费用支出页面上方各新增总计金额 + 记录数汇总卡片（与工资发放页面风格一致）

### 采购管理/费用支出页面拆分 + 日期筛选
- **文件**: `web/src/pages/PurchaseManagement.tsx` (新增), `web/src/pages/ExpenseManagement.tsx` (新增), `web/src/App.tsx`, `web/src/layouts/MainLayout.tsx`
- 原来的 Expenses.tsx 拆分为两个独立页面：
  - **采购管理** (`/purchases`)：采购记录表格、新增/编辑采购表单、发票上传、年月日三层日期筛选
  - **费用支出** (`/expenses`)：其他支出表格、新增/编辑支出表单、发票上传
- 左侧导航栏"支出管理"子菜单拆分为：采购管理、费用支出、语音记账、拍照记账
- 采购管理页新增日期筛选：年/月/日三级 Select，每级均有"全部"选项
  - 选 2025年-全部月-全部日 → 查看全年
  - 选 2025年-5月-全部日 → 查看该月
  - 选 2025年-5月-28日 → 查看该日
  - 年份从5年前到今年

### 采购表单：单价/总价双向计算
- **文件**: `web/src/pages/PurchaseManagement.tsx`
- 新增"总价"输入框，与"单价"双向联动
- 填数量+单价 → 自动算总价；填数量+总价 → 自动算单价
- 修改数量时同步更新关联字段
- 提交时补算缺失字段，两个都没填则提示错误
- 编辑记录时总价字段同步回显

### 支出类别支持自定义输入
- **文件**: `web/src/pages/ExpenseManagement.tsx`, `server/src/types/schemas.ts`, `server/src/types/enums.ts`
- 支出类别从固定 Select 改为 AutoComplete：既可从已有类别选择，也可手动输入新类别
- 新类别自动保存到数据库，后端不再限制枚举值
- 表格和图表已有 `|| v` 回退逻辑，自定义类别直接显示原始值

### 商品/供应商表拆分
- **文件**: `server/prisma/schema.prisma`, `server/src/services/product.service.ts`, `server/src/services/purchase.service.ts`, `server/src/types/schemas.ts`, `web/src/pages/Products.tsx`, `web/src/pages/PurchaseManagement.tsx`
- Product 表精简为 `name` + `category`，移除 `unit`/`defaultPrice`/`supplierId`
- Supplier 表与 Product 完全解耦
- Purchase 表新增 `unit` 字段（可选，16种预设单位下拉选择）
- 采购表单供应商/商品字段改为 AutoComplete：既可从已有记录选择，也可手动输入自动创建
- 后端 `resolveSupplier`/`resolveProduct`：UUID 则查找，名称则查或创建
- 前端商品管理页面同步精简

### 单位字段改为下拉选择
- **文件**: `web/src/pages/PurchaseManagement.tsx`, `web/src/pages/VoiceInput.tsx`, `web/src/pages/OcrInput.tsx`
- 单位从自由输入改为 Select 下拉，16 个选项：斤、公斤、个、箱、捆、袋、包、瓶、桶、把、只、条、份、盘、件、套
