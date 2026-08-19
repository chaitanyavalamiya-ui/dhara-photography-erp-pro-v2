-- DropForeignKey
ALTER TABLE "transaction"."bookings" DROP CONSTRAINT "bookings_client_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."bookings" DROP CONSTRAINT "bookings_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."bookings" DROP CONSTRAINT "bookings_status_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."clients" DROP CONSTRAINT "clients_primary_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."clients" DROP CONSTRAINT "clients_status_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."staff" DROP CONSTRAINT "staff_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."galleries" DROP CONSTRAINT "galleries_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."galleries" DROP CONSTRAINT "galleries_client_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."galleries" DROP CONSTRAINT "galleries_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."albums" DROP CONSTRAINT "albums_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."albums" DROP CONSTRAINT "albums_client_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."albums" DROP CONSTRAINT "albums_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."deliveries" DROP CONSTRAINT "deliveries_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."deliveries" DROP CONSTRAINT "deliveries_client_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."deliveries" DROP CONSTRAINT "deliveries_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."booking_staff_payments" DROP CONSTRAINT "booking_staff_payments_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."booking_activities" DROP CONSTRAINT "booking_activities_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."equipment_issues" DROP CONSTRAINT "equipment_issues_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."equipment_issues" DROP CONSTRAINT "equipment_issues_staff_id_fkey";

-- AddForeignKey
ALTER TABLE "transaction"."bookings" ADD CONSTRAINT "bookings_company_id_client_id_fkey" FOREIGN KEY ("company_id", "client_id") REFERENCES "transaction"."clients"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."bookings" ADD CONSTRAINT "bookings_company_id_branch_id_fkey" FOREIGN KEY ("company_id", "branch_id") REFERENCES "master"."company_branches"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."bookings" ADD CONSTRAINT "bookings_company_id_status_id_fkey" FOREIGN KEY ("company_id", "status_id") REFERENCES "master"."master_data"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."clients" ADD CONSTRAINT "clients_company_id_primary_branch_id_fkey" FOREIGN KEY ("company_id", "primary_branch_id") REFERENCES "master"."company_branches"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."clients" ADD CONSTRAINT "clients_company_id_status_id_fkey" FOREIGN KEY ("company_id", "status_id") REFERENCES "master"."master_data"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."staff" ADD CONSTRAINT "staff_company_id_branch_id_fkey" FOREIGN KEY ("company_id", "branch_id") REFERENCES "master"."company_branches"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."galleries" ADD CONSTRAINT "galleries_company_id_booking_id_fkey" FOREIGN KEY ("company_id", "booking_id") REFERENCES "transaction"."bookings"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."galleries" ADD CONSTRAINT "galleries_company_id_client_id_fkey" FOREIGN KEY ("company_id", "client_id") REFERENCES "transaction"."clients"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."galleries" ADD CONSTRAINT "galleries_company_id_branch_id_fkey" FOREIGN KEY ("company_id", "branch_id") REFERENCES "master"."company_branches"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."albums" ADD CONSTRAINT "albums_company_id_booking_id_fkey" FOREIGN KEY ("company_id", "booking_id") REFERENCES "transaction"."bookings"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."albums" ADD CONSTRAINT "albums_company_id_client_id_fkey" FOREIGN KEY ("company_id", "client_id") REFERENCES "transaction"."clients"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."albums" ADD CONSTRAINT "albums_company_id_branch_id_fkey" FOREIGN KEY ("company_id", "branch_id") REFERENCES "master"."company_branches"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."deliveries" ADD CONSTRAINT "deliveries_company_id_booking_id_fkey" FOREIGN KEY ("company_id", "booking_id") REFERENCES "transaction"."bookings"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."deliveries" ADD CONSTRAINT "deliveries_company_id_client_id_fkey" FOREIGN KEY ("company_id", "client_id") REFERENCES "transaction"."clients"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."deliveries" ADD CONSTRAINT "deliveries_company_id_branch_id_fkey" FOREIGN KEY ("company_id", "branch_id") REFERENCES "master"."company_branches"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."booking_staff_payments" ADD CONSTRAINT "booking_staff_payments_company_id_booking_id_fkey" FOREIGN KEY ("company_id", "booking_id") REFERENCES "transaction"."bookings"("company_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."booking_activities" ADD CONSTRAINT "booking_activities_company_id_booking_id_fkey" FOREIGN KEY ("company_id", "booking_id") REFERENCES "transaction"."bookings"("company_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_issues" ADD CONSTRAINT "equipment_issues_company_id_booking_id_fkey" FOREIGN KEY ("company_id", "booking_id") REFERENCES "transaction"."bookings"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."equipment_issues" ADD CONSTRAINT "equipment_issues_company_id_staff_id_fkey" FOREIGN KEY ("company_id", "staff_id") REFERENCES "transaction"."staff"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
