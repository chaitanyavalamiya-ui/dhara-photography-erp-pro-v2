-- AlterTable
ALTER TABLE "transaction"."invoices"
ADD COLUMN "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "advance_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'unpaid',
ADD COLUMN "invoice_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "due_date" TIMESTAMPTZ(6),
ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE INDEX "invoices_company_id_status_idx" ON "transaction"."invoices"("company_id", "status");

-- CreateIndex
CREATE INDEX "invoices_company_id_invoice_date_idx" ON "transaction"."invoices"("company_id", "invoice_date");
