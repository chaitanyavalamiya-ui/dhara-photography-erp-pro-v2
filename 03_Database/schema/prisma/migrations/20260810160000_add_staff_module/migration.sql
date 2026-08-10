-- CreateTable
CREATE TABLE "transaction"."staff" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "staff_code" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "mobile" TEXT,
    "normalized_mobile" TEXT,
    "email" TEXT,
    "normalized_email" TEXT,
    "address" TEXT,
    "role" TEXT NOT NULL,
    "joining_date" TIMESTAMPTZ(6),
    "payment_type" TEXT NOT NULL DEFAULT 'per_event',
    "default_rate" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "archived_by_id" UUID,
    "archived_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction"."booking_staff" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "assignment_date" TIMESTAMPTZ(6),
    "agreed_rate" DECIMAL(14,2),
    "notes" TEXT,
    "expense_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "archived_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "booking_staff_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "transaction"."expenses" ADD COLUMN "staff_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "staff_company_id_staff_code_key" ON "transaction"."staff"("company_id", "staff_code");

-- CreateIndex
CREATE INDEX "staff_company_id_role_idx" ON "transaction"."staff"("company_id", "role");

-- CreateIndex
CREATE INDEX "staff_company_id_is_active_idx" ON "transaction"."staff"("company_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "booking_staff_expense_id_key" ON "transaction"."booking_staff"("expense_id");

-- CreateIndex
CREATE INDEX "booking_staff_staff_id_assignment_date_idx" ON "transaction"."booking_staff"("staff_id", "assignment_date");

-- CreateIndex
CREATE INDEX "booking_staff_booking_id_idx" ON "transaction"."booking_staff"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_staff_booking_id_staff_id_role_key" ON "transaction"."booking_staff"("booking_id", "staff_id", "role");

-- CreateIndex
CREATE INDEX "expenses_staff_id_expense_date_idx" ON "transaction"."expenses"("staff_id", "expense_date");

-- AddForeignKey
ALTER TABLE "transaction"."staff" ADD CONSTRAINT "staff_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."staff" ADD CONSTRAINT "staff_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "master"."company_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."booking_staff" ADD CONSTRAINT "booking_staff_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."booking_staff" ADD CONSTRAINT "booking_staff_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "transaction"."staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."booking_staff" ADD CONSTRAINT "booking_staff_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "transaction"."expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "transaction"."staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
