-- CreateIndex
CREATE UNIQUE INDEX "equipment_company_id_id_key" ON "transaction"."equipment"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_issues_company_id_id_key" ON "transaction"."equipment_issues"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_returns_company_id_id_key" ON "transaction"."equipment_returns"("company_id", "id");
