-- Vehicle: tenant + campos completos
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "company_id" TEXT;
UPDATE "vehicles" v SET "company_id" = c."company_id"
FROM "customers" c WHERE v."customer_id" = c."id" AND v."company_id" IS NULL;
ALTER TABLE "vehicles" ALTER COLUMN "company_id" SET NOT NULL;

ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "manufacture_year" INTEGER;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "model_year" INTEGER;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "chassis" TEXT;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "notes" TEXT;

DO $$ BEGIN
  ALTER TABLE "vehicles" DROP COLUMN IF EXISTS "year";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_company_id_plate_key" ON "vehicles"("company_id", "plate");
CREATE INDEX IF NOT EXISTS "vehicles_company_id_customer_id_idx" ON "vehicles"("company_id", "customer_id");

DO $$ BEGIN
  ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Product: campos estendidos
CREATE TYPE "UnitOfMeasure" AS ENUM ('UN', 'M', 'M2', 'KG', 'L');

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit_of_measure" "UnitOfMeasure" NOT NULL DEFAULT 'UN';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "acquisition_cost" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "average_cost" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "storage_location" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "ncm" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "film_type" TEXT;

CREATE INDEX IF NOT EXISTS "products_company_id_name_idx" ON "products"("company_id", "name");

CREATE TABLE IF NOT EXISTS "bobinas" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "lot" TEXT,
    "initial_meters" DECIMAL(18,4) NOT NULL,
    "current_meters" DECIMAL(18,4) NOT NULL,
    "reserved_meters" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bobinas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "bobinas_company_id_code_key" ON "bobinas"("company_id", "code");
CREATE INDEX IF NOT EXISTS "bobinas_product_id_idx" ON "bobinas"("product_id");

DO $$ BEGIN
  ALTER TABLE "bobinas" ADD CONSTRAINT "bobinas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bobinas" ADD CONSTRAINT "bobinas_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TYPE "StockMovementType" AS ENUM ('GOODS_RECEIPT', 'WORK_ORDER_ISSUE', 'MANUAL_OUT', 'SUPPLIER_RETURN', 'LOSS', 'DAMAGE', 'TRANSFER', 'INVENTORY_ADJUST');

CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "idempotency_key" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "stock_movements_company_id_idempotency_key_key" ON "stock_movements"("company_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "stock_movements_company_id_occurred_at_idx" ON "stock_movements"("company_id", "occurred_at");
CREATE INDEX IF NOT EXISTS "stock_movements_product_id_idx" ON "stock_movements"("product_id");

DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
