-- CreateTable
CREATE TABLE "transaction"."galleries" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "event_type" TEXT,
    "event_date" TIMESTAMPTZ(6),
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "allow_client_download" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "archived_by_id" UUID,
    "archived_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction"."gallery_photos" (
    "id" UUID NOT NULL,
    "gallery_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "thumbnail_key" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "client_selected" BOOLEAN NOT NULL DEFAULT false,
    "client_selection_notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "gallery_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "galleries_company_id_status_idx" ON "transaction"."galleries"("company_id", "status");
CREATE INDEX "galleries_client_id_is_active_idx" ON "transaction"."galleries"("client_id", "is_active");
CREATE INDEX "galleries_booking_id_is_active_idx" ON "transaction"."galleries"("booking_id", "is_active");
CREATE INDEX "galleries_company_id_event_date_idx" ON "transaction"."galleries"("company_id", "event_date");
CREATE INDEX "gallery_photos_gallery_id_sort_order_idx" ON "transaction"."gallery_photos"("gallery_id", "sort_order");
CREATE INDEX "gallery_photos_gallery_id_client_selected_idx" ON "transaction"."gallery_photos"("gallery_id", "client_selected");

-- AddForeignKey
ALTER TABLE "transaction"."galleries" ADD CONSTRAINT "galleries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transaction"."galleries" ADD CONSTRAINT "galleries_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "master"."company_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transaction"."galleries" ADD CONSTRAINT "galleries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "transaction"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transaction"."galleries" ADD CONSTRAINT "galleries_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transaction"."gallery_photos" ADD CONSTRAINT "gallery_photos_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "transaction"."galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
