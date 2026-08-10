-- CreateTable
CREATE TABLE "transaction"."albums" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "gallery_id" UUID,
    "name" TEXT NOT NULL,
    "album_type" TEXT NOT NULL DEFAULT 'standard',
    "album_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "page_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "order_date" TIMESTAMPTZ(6),
    "expected_delivery_date" TIMESTAMPTZ(6),
    "actual_delivery_date" TIMESTAMPTZ(6),
    "vendor_name" TEXT,
    "vendor_expense" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(6),
    "archived_by_id" UUID,
    "archived_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction"."album_photos" (
    "id" UUID NOT NULL,
    "album_id" UUID NOT NULL,
    "gallery_photo_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "album_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "albums_company_id_status_idx" ON "transaction"."albums"("company_id", "status");
CREATE INDEX "albums_client_id_is_active_idx" ON "transaction"."albums"("client_id", "is_active");
CREATE INDEX "albums_booking_id_is_active_idx" ON "transaction"."albums"("booking_id", "is_active");
CREATE INDEX "albums_gallery_id_idx" ON "transaction"."albums"("gallery_id");
CREATE INDEX "albums_company_id_album_type_idx" ON "transaction"."albums"("company_id", "album_type");
CREATE INDEX "albums_company_id_order_date_idx" ON "transaction"."albums"("company_id", "order_date");
CREATE UNIQUE INDEX "album_photos_album_id_gallery_photo_id_key" ON "transaction"."album_photos"("album_id", "gallery_photo_id");
CREATE INDEX "album_photos_album_id_sort_order_idx" ON "transaction"."album_photos"("album_id", "sort_order");

-- AddForeignKey
ALTER TABLE "transaction"."albums" ADD CONSTRAINT "albums_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "master"."companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transaction"."albums" ADD CONSTRAINT "albums_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "master"."company_branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transaction"."albums" ADD CONSTRAINT "albums_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "transaction"."clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transaction"."albums" ADD CONSTRAINT "albums_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transaction"."bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transaction"."albums" ADD CONSTRAINT "albums_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "transaction"."galleries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transaction"."album_photos" ADD CONSTRAINT "album_photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "transaction"."albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transaction"."album_photos" ADD CONSTRAINT "album_photos_gallery_photo_id_fkey" FOREIGN KEY ("gallery_photo_id") REFERENCES "transaction"."gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
