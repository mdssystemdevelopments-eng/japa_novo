CREATE TYPE "GoodsReceiptStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS "suppliers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "document" TEXT,
    "state_registration" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "payment_term_days" INTEGER,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "suppliers_company_id_legal_name_idx" ON "suppliers"("company_id", "legal_name");
CREATE INDEX IF NOT EXISTS "suppliers_company_id_document_idx" ON "suppliers"("company_id", "document");

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "supplier_id" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "status" "GoodsReceiptStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "access_key" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "issued_at" TIMESTAMP(3);
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "file_name" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "file_path" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMP(3);
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "confirmed_by_id" TEXT;
ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "goods_receipts_company_id_access_key_key" ON "goods_receipts"("company_id", "access_key");
CREATE INDEX IF NOT EXISTS "goods_receipts_company_id_status_idx" ON "goods_receipts"("company_id", "status");

DO $$ BEGIN
  ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "goods_receipt_items" (
    "id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "product_id" TEXT,
    "description" TEXT NOT NULL,
    "ncm" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT,
    "unit_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lot" TEXT,
    "expiry_date" TIMESTAMP(3),
    "extract_confidence" DOUBLE PRECISION,
    CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "goods_receipt_items_receipt_id_idx" ON "goods_receipt_items"("receipt_id");

ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE TABLE IF NOT EXISTS "quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "quote_items_quote_id_idx" ON "quote_items"("quote_id");
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "service_description" TEXT;
UPDATE "appointments" SET "service_description" = 'Serviço' WHERE "service_description" IS NULL;
ALTER TABLE "appointments" ALTER COLUMN "service_description" SET NOT NULL;
