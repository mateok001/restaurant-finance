# 待办事项 & 后续思路

## 一、尚未完成的事项

### 1.1 微信小程序（Phase 10）

`miniapp/` 目录为空，Taro 项目未初始化。

**需要做**：
- 用 Taro CLI 初始化项目（`taro init miniapp`），选 React + TypeScript 模板
- 实现以下页面：仪表盘、语音记账（`wx.startRecord` / `RecorderManager`）、拍照记账（`wx.chooseImage` → OCR）、收入/支出快速录入、报表简化版
- 小程序端录音格式需确认与 FunASR 兼容（建议 PCM/WAV，16kHz 采样率）
- 小程序 Storage 替代 localStorage 存储 token
- 微信小程序审核需注意：属于"工具-记账"类目，不涉及 UGC 社交，审核风险较低

### 1.2 Dockerfile（缺失）

`server/Dockerfile` 和 `web/Dockerfile` 尚未创建，`docker-compose.yml` 已配置但缺少构建文件。

**server/Dockerfile 思路**：
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY prisma/ ./prisma/
COPY templates/ ./templates/
RUN npx prisma generate
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

**web/Dockerfile 思路**：多阶段构建，`npm run build` 后托管到 Nginx alpine。

### 1.3 测试（Phase 11）

未编写任何测试。建议：

| 层级 | 工具 | 覆盖重点 |
|------|------|----------|
| 后端单元测试 | Vitest / Jest | service 层业务逻辑（工资计算、毛利/净利润计算） |
| 后端 API 测试 | Supertest | 认证流程、CRUD 端点、权限校验 |
| 前端组件测试 | Vitest + React Testing Library | 表单验证、确认提交流程 |
| E2E | Playwright | 完整用户流程（登录→记账→查报表→生成简报） |

优先测试的内容：
1. `salary.service.ts` — 工资计算（应发/实发、批量生成、标记发放后自动创建支出）
2. `report.service.ts` — 毛利/净利润计算
3. `auth.service.ts` — token 刷新和轮转防重放
4. `purchase.service.ts` — 语音/OCR 确认提交流程

### 1.4 PDF 发票上传（前端缺失）

后端 API（`POST /purchases/:id/invoice`、`POST /expenses/:id/invoice`）已实现，但前端 Expenses 页面只做了录入表单，没有上传发票的入口。需要增加：
- 在采购/支出列表的操作列增加「上传发票」按钮
- 在采购/支出详情行内展示发票链接（可点击预览/下载）

### 1.5 CSV 导出

报表中心页面（`Reports.tsx`）有导出功能入口但未实现。思路：
- 后端增加 `GET /reports/export?format=csv` 端点，设置 `Content-Disposition: attachment`
- 前端报表页增加「导出 CSV」按钮
- CSV 列名使用中文表头

### 1.6 定时自动生成简报

当前简报只能手动触发。按需求应该有自动定时生成。思路：
- 使用 `node-cron` 或在 Docker 中用 cron 容器
- 日简报：每天 23:00 生成
- 周简报：每周日 23:00 生成
- 月简报：每月最后一天 23:00 生成
- 季简报：每季度最后一天生成
- 或者更简单的方案：在服务启动时注册 `setInterval` 检查

### 1.7 Redis 未实际使用

`config/` 中定义了 Redis 连接配置，Docker Compose 也启动了 Redis，但代码中没有实际使用。可以用于：
- 报表数据缓存（同一查询 5 分钟内走缓存）
- 语音/OCR 任务状态追踪
- 登录失败次数限制（替代内存 rate-limit）

### 1.8 简报 HTML 模板的数据注入问题

`server/templates/briefing.html` 通过 `replace('{{DATA}}', ...)` 注入 JSON，同时又在 HTML 中尝试用 `document.getElementById('DATA')` 读取。当前写法存在转义问题（`&quot;` 还原不稳定）。建议改为：
- Puppeteer 渲染前直接用模板引擎（EJS/Handlebars）注入数据到 `<script>` 标签
- 或使用 `page.evaluate()` 在渲染时直接传入 JavaScript 对象

### 1.9 其他小项

| 事项 | 说明 |
|------|------|
| `docs/api.md` | 计划中有但未创建，建议后续补 API 文档 |
| 响应式适配 | 当前 Web 端未做移动端响应式，平板/手机体验不佳 |
| 多语言 | 当前硬编码中文，如需扩展需要 i18n 方案 |
| 数据备份 | 生产环境需要 PostgreSQL 自动备份策略 |
| 操作日志 | 无操作审计日志（谁在什么时间做了什么操作） |

---

## 二、后续增强思路

### 2.1 库存管理

当前只有采购记录，没有库存概念。可以扩展：
- 新增 `inventory` 表（商品 + 当前库存量 + 安全库存阈值）
- 采购入库自动增加库存
- 每日根据收入推算消耗（例如按菜品 BOM 反推食材用量）
- 库存不足时预警提醒

### 2.2 菜品成本核算

关联菜谱和采购：
- 新增 `menu_items` 表（菜品名称、售价）
- 新增 `menu_recipes` 表（菜品 → 原材料 + 用量，即 BOM）
- 自动计算每道菜的成本和毛利率
- 分析哪些菜品利润最高/最低

### 2.3 多店铺支持

当前设计为单店。如需扩展：
- 新增 `stores` 表
- 所有业务表增加 `store_id` 外键
- 用户关联店铺（一个用户可属于多个店铺）
- 登录后选择当前操作的店铺

### 2.4 移动端 PWA

作为小程序的补充或替代方案：
- Web 端添加 `manifest.json` + Service Worker
- 支持离线录入（IndexedDB 暂存，联网后同步）
- 添加到手机主屏幕后体验接近原生 App

### 2.5 供应商对账

- 按供应商 + 时间段生成对账单
- 记录付款状态（已付/未付/部分付款）
- 应付账款汇总和到期提醒

### 2.6 AI 优化

- 对 FunASR 进行餐饮领域微调（常见食材名称、计量单位）
- PaddleOCR 自定义模板训练（针对常用进货单格式）
- Qwen 的 prompt 优化：加入已有供应商/商品列表作为上下文，提高匹配准确率

### 2.7 数据可视化增强

- 仪表盘增加趋势图（近7天/30天收入支出折线图）
- 热力图展示每周各天收入分布（找出高峰日）
- 收入渠道占比变化趋势（堆叠面积图）

---

## 三、优先级建议

| 优先级 | 事项 | 理由 |
|--------|------|------|
| P0 | Dockerfile | 否则 docker-compose 无法使用 |
| P0 | 发票上传前端 | 核心需求，PDF 发票是用户明确要求的 |
| P1 | 微信小程序 | 用户明确需要，且手机拍照/语音场景依赖小程序 |
| P1 | 测试（核心模块） | 财务软件数据准确性至关重要 |
| P1 | 简报自动定时生成 | 需求明确，手动触发不够用 |
| P2 | CSV 导出 | 提高实用性，但不是阻塞项 |
| P2 | Redis 实际使用 | 性能优化，现阶段数据量小不太需要 |
| P3 | 库存管理 / 菜品成本 | 增强功能，可以在核心功能稳定后再做 |
| P3 | PWA / 多店铺 | 远期方向 |
