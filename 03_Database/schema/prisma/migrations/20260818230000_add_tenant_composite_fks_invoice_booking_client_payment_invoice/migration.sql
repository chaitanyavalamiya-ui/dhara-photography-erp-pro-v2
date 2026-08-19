-- DropForeignKey
ALTER TABLE "transaction"."invoices" DROP CONSTRAINT "invoices_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."invoices" DROP CONSTRAINT "invoices_client_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."payments" DROP CONSTRAINT "payments_invoice_id_fkey";

-- AddForeignKey
ALTER TABLE "transaction"."invoices" ADD CONSTRAINT "invoices_company_id_client_id_fkey" FOREIGN KEY ("company_id", "client_id") REFERENCES "transaction"."clients"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."invoices" ADD CONSTRAINT "invoices_company_id_booking_id_fkey" FOREIGN KEY ("company_id", "booking_id") REFERENCES "transaction"."bookings"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."payments" ADD CONSTRAINT "payments_company_id_invoice_id_fkey" FOREIGN KEY ("company_id", "invoice_id") REFERENCES "transaction"."invoices"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
