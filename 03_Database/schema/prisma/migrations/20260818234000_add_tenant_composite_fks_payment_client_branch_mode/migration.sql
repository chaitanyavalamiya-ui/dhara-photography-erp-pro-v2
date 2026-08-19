-- DropForeignKey
ALTER TABLE "transaction"."payments" DROP CONSTRAINT "payments_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."payments" DROP CONSTRAINT "payments_client_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction"."payments" DROP CONSTRAINT "payments_payment_mode_id_fkey";

-- AddForeignKey
ALTER TABLE "transaction"."payments" ADD CONSTRAINT "payments_company_id_branch_id_fkey" FOREIGN KEY ("company_id", "branch_id") REFERENCES "master"."company_branches"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."payments" ADD CONSTRAINT "payments_company_id_client_id_fkey" FOREIGN KEY ("company_id", "client_id") REFERENCES "transaction"."clients"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction"."payments" ADD CONSTRAINT "payments_company_id_payment_mode_id_fkey" FOREIGN KEY ("company_id", "payment_mode_id") REFERENCES "master"."master_data"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
