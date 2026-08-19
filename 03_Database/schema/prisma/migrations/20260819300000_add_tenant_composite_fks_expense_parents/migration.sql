-- DropForeignKey
ALTER TABLE "transaction"."expenses" DROP CONSTRAINT "expenses_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."expenses" DROP CONSTRAINT "expenses_client_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."expenses" DROP CONSTRAINT "expenses_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."expenses" DROP CONSTRAINT "expenses_invoice_id_fkey";

-- AddForeignKey
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_company_id_branch_id_fkey" FOREIGN KEY ("company_id", "branch_id") REFERENCES "master"."company_branches"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_company_id_client_id_fkey" FOREIGN KEY ("company_id", "client_id") REFERENCES "transaction"."clients"("company_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_company_id_booking_id_fkey" FOREIGN KEY ("company_id", "booking_id") REFERENCES "transaction"."bookings"("company_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."expenses" ADD CONSTRAINT "expenses_company_id_invoice_id_fkey" FOREIGN KEY ("company_id", "invoice_id") REFERENCES "transaction"."invoices"("company_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;
