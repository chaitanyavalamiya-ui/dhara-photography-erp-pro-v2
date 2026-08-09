-- AlterTable
ALTER TABLE "transaction"."clients"
ADD COLUMN "whatsapp" TEXT,
ADD COLUMN "normalized_whatsapp" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "date_of_birth" DATE,
ADD COLUMN "anniversary_date" DATE,
ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE INDEX "clients_company_id_city_idx" ON "transaction"."clients"("company_id", "city");

-- CreateIndex
CREATE INDEX "clients_company_id_normalized_whatsapp_idx" ON "transaction"."clients"("company_id", "normalized_whatsapp");

-- CreateIndex
CREATE INDEX "clients_company_id_date_of_birth_idx" ON "transaction"."clients"("company_id", "date_of_birth");

-- CreateIndex
CREATE INDEX "clients_company_id_anniversary_date_idx" ON "transaction"."clients"("company_id", "anniversary_date");
