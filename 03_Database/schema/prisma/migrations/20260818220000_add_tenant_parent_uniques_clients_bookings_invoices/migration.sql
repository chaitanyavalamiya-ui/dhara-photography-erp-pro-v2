-- CreateIndex
CREATE UNIQUE INDEX "clients_company_id_id_key" ON "transaction"."clients"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_company_id_id_key" ON "transaction"."bookings"("company_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_company_id_id_key" ON "transaction"."invoices"("company_id", "id");
