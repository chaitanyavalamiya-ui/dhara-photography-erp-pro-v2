-- DropForeignKey
ALTER TABLE "transaction"."invoices" DROP CONSTRAINT "invoices_branch_id_fkey";

-- AddForeignKey
ALTER TABLE "transaction"."invoices" ADD CONSTRAINT "invoices_company_id_branch_id_fkey" FOREIGN KEY ("company_id", "branch_id") REFERENCES "master"."company_branches"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
