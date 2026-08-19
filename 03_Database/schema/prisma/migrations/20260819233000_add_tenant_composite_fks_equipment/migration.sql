-- DropForeignKey
ALTER TABLE "transaction"."equipment_returns" DROP CONSTRAINT "equipment_returns_issue_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."equipment_history" DROP CONSTRAINT "equipment_history_equipment_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."equipment_history" DROP CONSTRAINT "equipment_history_issue_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."equipment_history" DROP CONSTRAINT "equipment_history_return_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."equipment_history" DROP CONSTRAINT "equipment_history_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."equipment_history" DROP CONSTRAINT "equipment_history_staff_id_fkey";

-- AddForeignKey
ALTER TABLE "transaction"."equipment_returns" ADD CONSTRAINT "equipment_returns_company_id_issue_id_fkey" FOREIGN KEY ("company_id", "issue_id") REFERENCES "transaction"."equipment_issues"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_history" ADD CONSTRAINT "equipment_history_company_id_equipment_id_fkey" FOREIGN KEY ("company_id", "equipment_id") REFERENCES "transaction"."equipment"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_history" ADD CONSTRAINT "equipment_history_company_id_issue_id_fkey" FOREIGN KEY ("company_id", "issue_id") REFERENCES "transaction"."equipment_issues"("company_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_history" ADD CONSTRAINT "equipment_history_company_id_return_id_fkey" FOREIGN KEY ("company_id", "return_id") REFERENCES "transaction"."equipment_returns"("company_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_history" ADD CONSTRAINT "equipment_history_company_id_booking_id_fkey" FOREIGN KEY ("company_id", "booking_id") REFERENCES "transaction"."bookings"("company_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_history" ADD CONSTRAINT "equipment_history_company_id_staff_id_fkey" FOREIGN KEY ("company_id", "staff_id") REFERENCES "transaction"."staff"("company_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;
