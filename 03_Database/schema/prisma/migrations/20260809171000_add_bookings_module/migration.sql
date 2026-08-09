-- CreateTable
CREATE TABLE "master"."service_rates" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'service',
    "default_rate" DECIMAL(14,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'day',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "service_rates_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "transaction"."bookings"
ADD COLUMN "event_type" TEXT NOT NULL DEFAULT 'Other',
ADD COLUMN "event_end_date" TIMESTAMPTZ(6),
ADD COLUMN "venue" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "advance_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "balance_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "transaction"."booking_items" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "service_rate_id" UUID,
    "service_name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'day',
    "rate" DECIMAL(14,2) NOT NULL,
    "days" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_rates_company_id_code_key" ON "master"."service_rates"("company_id", "code");

-- CreateIndex
CREATE INDEX "service_rates_company_id_category_is_active_idx" ON "master"."service_rates"("company_id", "category", "is_active");

-- CreateIndex
CREATE INDEX "bookings_company_id_event_type_idx" ON "transaction"."bookings"("company_id", "event_type");

-- CreateIndex
CREATE INDEX "bookings_company_id_status_id_idx" ON "transaction"."bookings"("company_id", "status_id");

-- CreateIndex
CREATE INDEX "booking_items_booking_id_sort_order_idx" ON "transaction"."booking_items"("booking_id", "sort_order");

-- AddForeignKey
ALTER TABLE "master"."service_rates" ADD CONSTRAINT "service_rates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."booking_items" ADD CONSTRAINT "booking_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."booking_items" ADD CONSTRAINT "booking_items_service_rate_id_fkey" FOREIGN KEY ("service_rate_id") REFERENCES "master"."service_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
