-- Booking operations module (staff payments, equipment, activities, reminders)
-- Safe additive migration: idempotent for databases already updated via db push.

-- AlterTable
ALTER TABLE "transaction"."bookings"
ADD COLUMN IF NOT EXISTS "event_progress_stage" TEXT NOT NULL DEFAULT 'booking_confirmed';

-- CreateTable
CREATE TABLE IF NOT EXISTS "transaction"."booking_staff_payments" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "booking_staff_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_date" TIMESTAMPTZ(6),
    "payment_mode" TEXT,
    "notes" TEXT,
    "expense_id" UUID,
    "recorded_by" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "booking_staff_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "transaction"."booking_equipment" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "equipment_name" TEXT NOT NULL,
    "quantity_issued" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quantity_returned" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'not_issued',
    "issued_by_name" TEXT,
    "issued_at" TIMESTAMPTZ(6),
    "returned_at" TIMESTAMPTZ(6),
    "condition_checkout" TEXT,
    "condition_return" TEXT,
    "missing_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "damaged_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "checkout_notes" TEXT,
    "return_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "booking_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "transaction"."booking_activities" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "activity_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "transaction"."reminders" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "client_id" UUID,
    "booking_id" UUID,
    "reminder_type" TEXT NOT NULL,
    "reminder_date" DATE NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completed_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "booking_staff_payments_expense_id_key" ON "transaction"."booking_staff_payments"("expense_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_staff_payments_booking_id_payment_date_idx" ON "transaction"."booking_staff_payments"("booking_id", "payment_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_staff_payments_booking_staff_id_status_idx" ON "transaction"."booking_staff_payments"("booking_staff_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_equipment_booking_id_status_idx" ON "transaction"."booking_equipment"("booking_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "booking_activities_booking_id_occurred_at_idx" ON "transaction"."booking_activities"("booking_id", "occurred_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reminders_company_id_reminder_date_status_idx" ON "transaction"."reminders"("company_id", "reminder_date", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reminders_booking_id_status_idx" ON "transaction"."reminders"("booking_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reminders_client_id_reminder_date_idx" ON "transaction"."reminders"("client_id", "reminder_date");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "transaction"."booking_staff_payments"
    ADD CONSTRAINT "booking_staff_payments_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transaction"."booking_staff_payments"
    ADD CONSTRAINT "booking_staff_payments_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transaction"."booking_staff_payments"
    ADD CONSTRAINT "booking_staff_payments_booking_staff_id_fkey"
    FOREIGN KEY ("booking_staff_id") REFERENCES "transaction"."booking_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transaction"."booking_staff_payments"
    ADD CONSTRAINT "booking_staff_payments_expense_id_fkey"
    FOREIGN KEY ("expense_id") REFERENCES "transaction"."expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transaction"."booking_equipment"
    ADD CONSTRAINT "booking_equipment_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transaction"."booking_activities"
    ADD CONSTRAINT "booking_activities_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transaction"."booking_activities"
    ADD CONSTRAINT "booking_activities_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transaction"."reminders"
    ADD CONSTRAINT "reminders_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transaction"."reminders"
    ADD CONSTRAINT "reminders_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "transaction"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "transaction"."reminders"
    ADD CONSTRAINT "reminders_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
