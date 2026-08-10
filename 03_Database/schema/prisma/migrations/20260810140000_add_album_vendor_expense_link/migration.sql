-- AlterTable
ALTER TABLE "transaction"."albums" ADD COLUMN "vendor_expense_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "albums_vendor_expense_id_key" ON "transaction"."albums"("vendor_expense_id");

-- AddForeignKey
ALTER TABLE "transaction"."albums" ADD CONSTRAINT "albums_vendor_expense_id_fkey" FOREIGN KEY ("vendor_expense_id") REFERENCES "transaction"."expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
