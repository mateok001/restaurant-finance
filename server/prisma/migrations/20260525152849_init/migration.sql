-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "avatar_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "device_info" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contact_phone" TEXT,
    "contact_person" TEXT,
    "address" TEXT,
    "remark" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'ingredients',
    "unit" TEXT NOT NULL DEFAULT '斤',
    "default_price" REAL,
    "supplier_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplier_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 0,
    "unit_price" REAL NOT NULL DEFAULT 0,
    "total_amount" REAL NOT NULL DEFAULT 0,
    "purchase_date" DATETIME NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "input_method" TEXT NOT NULL DEFAULT 'manual',
    "invoice_file_url" TEXT,
    "raw_input_text" TEXT,
    "memo" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "purchases_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchases_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "expense_date" DATETIME NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "description" TEXT,
    "invoice_file_url" TEXT,
    "salary_record_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "expenses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "expenses_salary_record_id_fkey" FOREIGN KEY ("salary_record_id") REFERENCES "salary_records" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "id_card_number" TEXT NOT NULL,
    "bank_card_number" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "base_salary" REAL NOT NULL DEFAULT 0,
    "scheduled_pay_day" INTEGER NOT NULL DEFAULT 15,
    "position" TEXT NOT NULL DEFAULT 'waiter',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "hire_date" DATETIME NOT NULL,
    "leave_date" DATETIME,
    "remark" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "salary_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employee_id" TEXT NOT NULL,
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "base_salary" REAL NOT NULL DEFAULT 0,
    "bonus" REAL NOT NULL DEFAULT 0,
    "deduction" REAL NOT NULL DEFAULT 0,
    "attendance_status" TEXT NOT NULL DEFAULT '{}',
    "gross_salary" REAL NOT NULL DEFAULT 0,
    "net_salary" REAL NOT NULL DEFAULT 0,
    "scheduled_pay_date" DATETIME NOT NULL,
    "actual_pay_date" DATETIME,
    "pay_status" TEXT NOT NULL DEFAULT 'pending',
    "recorded_by" TEXT NOT NULL,
    "memo" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "salary_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "salary_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "revenue_channels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "daily_revenues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel_id" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "revenue_date" DATETIME NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "memo" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "daily_revenues_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "revenue_channels" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "daily_revenues_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "image_url" TEXT,
    "summary_json" TEXT,
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT NOT NULL,
    CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_salary_record_id_key" ON "expenses"("salary_record_id");
