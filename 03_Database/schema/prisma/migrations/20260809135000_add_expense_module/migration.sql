-- CreateTable
CREATE TABLE "transaction"."expenses" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "expense_date" TIMESTAMPTZ(6) NOT NULL,
    "payment_mode_id" UUID,
    "reference_number" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "archived_by_id" UUID,
    "archived_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_company_id_expense_date_idx" ON "transaction"."expenses"("company_id", "expense_date");

-- CreateIndex
CREATE INDEX "expenses_branch_id_expense_date_idx" ON "transaction"."expenses"("branch_id", "expense_date");

-- CreateIndex
CREATE INDEX "expenses_category_id_expense_date_idx" ON "transaction"."expenses"("category_id", "expense_date");

-- CreateIndex
CREATE INDEX "expenses_payment_mode_id_idx" ON "transaction"."expenses"("payment_mode_id");

-- AddForeignKey
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "master"."company_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "master"."master_data"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_payment_mode_id_fkey" FOREIGN KEY ("payment_mode_id") REFERENCES "master"."master_data"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
