-- CreateTable
CREATE TABLE "transaction"."equipment" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tracking_type" TEXT NOT NULL DEFAULT 'bulk',
    "serial_number" TEXT,
    "total_quantity" INTEGER NOT NULL DEFAULT 1,
    "available_quantity" INTEGER NOT NULL DEFAULT 1,
    "on_shoot_quantity" INTEGER NOT NULL DEFAULT 0,
    "missing_quantity" INTEGER NOT NULL DEFAULT 0,
    "under_repair_quantity" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "archived_by_id" UUID,
    "archived_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction"."equipment_issues" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "issue_number" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "equipment_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction"."equipment_issue_items" (
    "id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "quantity_issued" INTEGER NOT NULL,
    "quantity_returned" INTEGER NOT NULL DEFAULT 0,
    "missing_quantity" INTEGER NOT NULL DEFAULT 0,
    "damaged_quantity" INTEGER NOT NULL DEFAULT 0,
    "serial_number" TEXT,
    "condition_out" TEXT NOT NULL,
    "condition_in" TEXT,
    "return_status" TEXT NOT NULL DEFAULT 'OUT',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "equipment_issue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction"."equipment_returns" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "returned_at" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "equipment_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction"."equipment_return_items" (
    "id" UUID NOT NULL,
    "return_id" UUID NOT NULL,
    "issue_item_id" UUID NOT NULL,
    "quantity_returned" INTEGER NOT NULL,
    "missing_quantity" INTEGER NOT NULL DEFAULT 0,
    "damaged_quantity" INTEGER NOT NULL DEFAULT 0,
    "condition_in" TEXT NOT NULL,
    "return_status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction"."equipment_history" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "equipment_id" UUID NOT NULL,
    "issue_id" UUID,
    "return_id" UUID,
    "booking_id" UUID,
    "staff_id" UUID,
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition_out" TEXT,
    "condition_in" TEXT,
    "notes" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_company_id_code_key" ON "transaction"."equipment"("company_id", "code");

-- CreateIndex
CREATE INDEX "equipment_company_id_category_idx" ON "transaction"."equipment"("company_id", "category");

-- CreateIndex
CREATE INDEX "equipment_company_id_status_idx" ON "transaction"."equipment"("company_id", "status");

-- CreateIndex
CREATE INDEX "equipment_company_id_is_active_idx" ON "transaction"."equipment"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "equipment_company_id_serial_number_idx" ON "transaction"."equipment"("company_id", "serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_issues_company_id_issue_number_key" ON "transaction"."equipment_issues"("company_id", "issue_number");

-- CreateIndex
CREATE INDEX "equipment_issues_booking_id_status_idx" ON "transaction"."equipment_issues"("booking_id", "status");

-- CreateIndex
CREATE INDEX "equipment_issues_staff_id_issued_at_idx" ON "transaction"."equipment_issues"("staff_id", "issued_at");

-- CreateIndex
CREATE INDEX "equipment_issues_company_id_status_idx" ON "transaction"."equipment_issues"("company_id", "status");

-- CreateIndex
CREATE INDEX "equipment_issue_items_issue_id_idx" ON "transaction"."equipment_issue_items"("issue_id");

-- CreateIndex
CREATE INDEX "equipment_issue_items_equipment_id_idx" ON "transaction"."equipment_issue_items"("equipment_id");

-- CreateIndex
CREATE INDEX "equipment_returns_issue_id_returned_at_idx" ON "transaction"."equipment_returns"("issue_id", "returned_at");

-- CreateIndex
CREATE INDEX "equipment_returns_company_id_returned_at_idx" ON "transaction"."equipment_returns"("company_id", "returned_at");

-- CreateIndex
CREATE INDEX "equipment_return_items_return_id_idx" ON "transaction"."equipment_return_items"("return_id");

-- CreateIndex
CREATE INDEX "equipment_return_items_issue_item_id_idx" ON "transaction"."equipment_return_items"("issue_item_id");

-- CreateIndex
CREATE INDEX "equipment_history_equipment_id_occurred_at_idx" ON "transaction"."equipment_history"("equipment_id", "occurred_at");

-- CreateIndex
CREATE INDEX "equipment_history_booking_id_occurred_at_idx" ON "transaction"."equipment_history"("booking_id", "occurred_at");

-- CreateIndex
CREATE INDEX "equipment_history_staff_id_occurred_at_idx" ON "transaction"."equipment_history"("staff_id", "occurred_at");

-- CreateIndex
CREATE INDEX "equipment_history_company_id_action_idx" ON "transaction"."equipment_history"("company_id", "action");

-- AddForeignKey
ALTER TABLE "transaction"."equipment" ADD CONSTRAINT "equipment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_issues" ADD CONSTRAINT "equipment_issues_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_issues" ADD CONSTRAINT "equipment_issues_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_issues" ADD CONSTRAINT "equipment_issues_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "transaction"."staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_issue_items" ADD CONSTRAINT "equipment_issue_items_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "transaction"."equipment_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_issue_items" ADD CONSTRAINT "equipment_issue_items_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "transaction"."equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_returns" ADD CONSTRAINT "equipment_returns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_returns" ADD CONSTRAINT "equipment_returns_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "transaction"."equipment_issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_return_items" ADD CONSTRAINT "equipment_return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "transaction"."equipment_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_return_items" ADD CONSTRAINT "equipment_return_items_issue_item_id_fkey" FOREIGN KEY ("issue_item_id") REFERENCES "transaction"."equipment_issue_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_history" ADD CONSTRAINT "equipment_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_history" ADD CONSTRAINT "equipment_history_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "transaction"."equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_history" ADD CONSTRAINT "equipment_history_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "transaction"."equipment_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_history" ADD CONSTRAINT "equipment_history_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "transaction"."equipment_returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_history" ADD CONSTRAINT "equipment_history_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_history" ADD CONSTRAINT "equipment_history_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "transaction"."staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
