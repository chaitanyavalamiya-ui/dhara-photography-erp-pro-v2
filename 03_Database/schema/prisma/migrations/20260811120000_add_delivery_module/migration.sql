-- CreateTable
CREATE TABLE "transaction"."deliveries" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "album_id" UUID,
    "deliverable_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expected_date" TIMESTAMPTZ(6),
    "delivered_date" TIMESTAMPTZ(6),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "archived_by_id" UUID,
    "archived_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deliveries_company_id_status_idx" ON "transaction"."deliveries"("company_id", "status");

-- CreateIndex
CREATE INDEX "deliveries_company_id_deliverable_type_idx" ON "transaction"."deliveries"("company_id", "deliverable_type");

-- CreateIndex
CREATE INDEX "deliveries_booking_id_status_idx" ON "transaction"."deliveries"("booking_id", "status");

-- CreateIndex
CREATE INDEX "deliveries_client_id_is_active_idx" ON "transaction"."deliveries"("client_id", "is_active");

-- CreateIndex
CREATE INDEX "deliveries_company_id_expected_date_idx" ON "transaction"."deliveries"("company_id", "expected_date");

-- AddForeignKey
ALTER TABLE "transaction"."deliveries" ADD CONSTRAINT "deliveries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."deliveries" ADD CONSTRAINT "deliveries_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "master"."company_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."deliveries" ADD CONSTRAINT "deliveries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "transaction"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."deliveries" ADD CONSTRAINT "deliveries_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."deliveries" ADD CONSTRAINT "deliveries_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "transaction"."albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;
