# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

小餐馆财务记账软件 — a full-stack financial accounting app for small restaurants. Tracks procurement, expenses, revenue, employee payroll, and generates automated business reports (daily/weekly/monthly/quarterly) as PNG images.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript, Prisma ORM |
| Database | SQLite (via Prisma) |
| Cache | Redis |
| File storage | MinIO (S3-compatible, local) |
| Web frontend | React 18 + Vite + Ant Design 5 + ECharts |
| Mini-program | Taro 3.x + React (not yet built) |
| Voice recognition | FunASR (local Docker service, CPU-compatible) |
| OCR | PaddleOCR (local Docker service) |
| Text → structured data | Ollama + Qwen2.5 (local LLM) |
| Report images | Puppeteer (server-side HTML → PNG) |
| Auth | JWT (access 2h + refresh 30d dual-token) |

## Commands

```bash
# === Backend (server/) ===
cd server
npm install
npx prisma generate                  # regenerate Prisma client after schema changes
npx prisma migrate dev --name init   # create/reset database tables
npm run prisma:seed                  # seed admin user + default revenue channels
npm run dev                          # start dev server on :8080 (hot-reload via tsx)
npm run build                        # compile TypeScript to dist/

# === Frontend (web/) ===
cd web
npm install
npm run dev                          # start Vite dev server on :3000 (proxies /api to :8080)
npm run build                        # production build

# === Docker (full stack) ===
docker compose up -d                 # start MinIO + server + web
docker compose --profile ai up -d    # also start FunASR + PaddleOCR + Ollama
docker exec rf-ollama ollama pull qwen2.5:3b  # pull LLM model on first run
```

## Architecture

### Backend layer pattern

Every module follows the same 3-layer pattern:

```
routes/<module>.ts   →  HTTP handlers, auth guards, multer uploads, delegates to service
services/<module>.ts →  business logic, Prisma queries, throws AppError
prisma/schema.prisma →  data model (single source of truth)
```

All routes are mounted with `authenticate` middleware at minimum. Write operations require `requireAdminOrPartner` guard. The middleware injects `req.userId`, `req.userRole`, and `req.userDisplayName` from the JWT payload.

### Auth flow

- `POST /auth/login` returns `{ accessToken, refreshToken, user }`. Frontend stores both in localStorage.
- API client ([web/src/services/api.ts](web/src/services/api.ts)) auto-attaches `Authorization: Bearer <token>`, and intercepts 401 responses to attempt a silent refresh before redirecting to `/login`.
- `POST /auth/refresh` rotates refresh tokens — old tokens are deleted server-side (rotation prevents replay). If a refresh token is reused after expiry, all sessions for that user are destroyed.
- Three roles: `admin` (full access), `partner` (same minus user management), `staff` (read-only + input).

### AI pipeline (voice / OCR → database)

Both voice and OCR follow the same pattern:
1. Frontend uploads media (audio blob or image) → `POST /purchases/voice` or `POST /purchases/ocr`
2. Backend calls local AI service (FunASR or PaddleOCR HTTP API) → raw text
3. Raw text goes to Ollama/Qwen for structured extraction → `[{ productName, supplierName, quantity, unit, unitPrice }]`
4. Response returns `{ rawText, parsedItems, needsConfirmation: true }` — **all AI results require manual confirmation before saving**
5. Frontend shows a side-by-side editor (raw text + editable table), user corrects/supplements, then calls `POST /purchases/confirm-parsed` to persist

AI services run in `ai` Docker Compose profile. When unavailable, voice/OCR pages fall back to demo mode with hardcoded sample data.

### Database key relationships

- `purchases` links to `suppliers` and `products` (both auto-created on-the-fly during voice/OCR if not found)
- `salary_records` → `employees`: batch generation pulls active employees and their base salary. Marking as `paid` auto-creates an `expenses` row with category `salary`.
- `expenses.salaryRecordId` is a 1:1 link back to the salary record that created it — salary expenses cannot be deleted independently.
- `sessions` stores refresh tokens for validation and rotation.
- Sensitive employee fields (`idCardNumber`, `bankCardNumber`) are masked by the service layer; only `showFull=true` query param on GET returns full values.

### Frontend structure

- `MainLayout.tsx` renders the sidebar (collapsible, dark theme) + top header with user dropdown. All authenticated pages are children.
- `useAuthStore` (Zustand) holds current user state; persisted token check determines `isLoggedIn`.
- Ant Design 5 is themed with warm restaurant palette (`colorPrimary: #D4A574`).
- ECharts is used in Dashboard, Reports, and Briefing pages for pie/bar charts.
- Voice/Ocr pages are standalone input flows with inline editing tables.

### Briefing generation

`POST /briefing/generate` takes `{ type, periodStart, periodEnd }`. The service:
1. Queries current period revenue + expenses + purchases
2. Queries previous period (MoM) and same period last year (YoY)
3. Calculates changes; flags categories where MoM change > 30% as anomalies
4. Renders `server/templates/briefing.html` via Puppeteer → PNG
5. Uploads PNG to MinIO, saves record to `reports` table

### Revenue route note

Revenue routes are mounted at `/api/v1` (not `/api/v1/revenue`): `/api/v1/revenue-channels` and `/api/v1/daily-revenue`. This is different from other modules.

## Key constraints

- No cloud API dependencies — all AI/ML runs locally via Docker.
- Employee termination is a soft toggle (`is_active = false`), never hard-delete.
- Purchases/suppliers/products linked to existing records cannot be deleted.
- Salary records marked `paid` are immutable and cannot be edited or deleted.
- There is no separate `miniapp/` implementation yet — the Taro project structure is reserved for Phase 10.
- No tests exist yet (Phase 11 pending).

## Seed data

Default accounts after seeding: `admin / admin123` (admin), `partner / partner123` (partner). Default revenue channels: 一楼堂食, 二楼包间, 美团外卖, 淘宝闪购.
