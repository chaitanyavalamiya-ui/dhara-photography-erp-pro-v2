-- AlterTable payments
ALTER TABLE "transaction"."payments" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- AlterTable expenses
ALTER TABLE "transaction"."expenses"
ADD COLUMN IF NOT EXISTS "client_id" UUID,
ADD COLUMN IF NOT EXISTS "booking_id" UUID,
ADD COLUMN IF NOT EXISTS "invoice_id" UUID,
ADD COLUMN IF NOT EXISTS "vendor_person" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expenses_booking_id_expense_date_idx" ON "transaction"."expenses"("booking_id", "expense_date");
CREATE INDEX IF NOT EXISTS "expenses_client_id_expense_date_idx" ON "transaction"."expenses"("client_id", "expense_date");

-- AddForeignKey
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "transaction"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "transaction"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
