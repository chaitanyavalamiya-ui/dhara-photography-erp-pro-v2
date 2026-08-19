-- DropForeignKey
ALTER TABLE "transaction"."payments" DROP CONSTRAINT "payments_booking_id_fkey";

-- AddForeignKey
ALTER TABLE "transaction"."payments" ADD CONSTRAINT "payments_company_id_booking_id_fkey" FOREIGN KEY ("company_id", "booking_id") REFERENCES "transaction"."bookings"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
