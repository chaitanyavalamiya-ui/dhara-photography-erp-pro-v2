-- AlterTable
ALTER TABLE "transaction"."booking_staff" ADD COLUMN "company_id" UUID;

-- Backfill tenant ownership from the canonical booking
UPDATE "transaction"."booking_staff" AS bs
SET "company_id" = b."company_id"
FROM "transaction"."bookings" AS b
WHERE b."id" = bs."booking_id"
  AND bs."company_id" IS NULL;

-- Backstop: fail the migration if any row could not derive company_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "transaction"."booking_staff"
    WHERE "company_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'booking_staff.company_id backfill left NULL rows';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "transaction"."booking_staff" ALTER COLUMN "company_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "expenses_company_id_id_key" ON "transaction"."expenses"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_staff_company_id_expense_id_key" ON "transaction"."booking_staff"("company_id", "expense_id");

-- AddForeignKey
ALTER TABLE "transaction"."booking_staff" ADD CONSTRAINT "booking_staff_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "transaction"."booking_staff" DROP CONSTRAINT "booking_staff_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."booking_staff" DROP CONSTRAINT "booking_staff_staff_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."booking_staff" DROP CONSTRAINT "booking_staff_expense_id_fkey";

-- AddForeignKey
ALTER TABLE "transaction"."booking_staff" ADD CONSTRAINT "booking_staff_company_id_booking_id_fkey" FOREIGN KEY ("company_id", "booking_id") REFERENCES "transaction"."bookings"("company_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."booking_staff" ADD CONSTRAINT "booking_staff_company_id_staff_id_fkey" FOREIGN KEY ("company_id", "staff_id") REFERENCES "transaction"."staff"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."booking_staff" ADD CONSTRAINT "booking_staff_company_id_expense_id_fkey" FOREIGN KEY ("company_id", "expense_id") REFERENCES "transaction"."expenses"("company_id", "id") ON DELETE SET NULL ON UPDATE CASCADE;
