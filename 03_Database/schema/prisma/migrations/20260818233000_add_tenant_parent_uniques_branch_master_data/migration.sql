-- CreateIndex
CREATE UNIQUE INDEX "company_branches_company_id_id_key" ON "master"."company_branches"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "master_data_company_id_id_key" ON "master"."master_data"("company_id", "id");
