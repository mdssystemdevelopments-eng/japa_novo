ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "quote_id" TEXT;
DO $$ BEGIN
  ALTER TABLE "appointments" ADD CONSTRAINT "appointments_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "quote_id" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "appointment_id" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "checklist" JSONB;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3);
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "stock_consumed_at" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "work_order_items" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    CONSTRAINT "work_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "work_order_items_work_order_id_idx" ON "work_order_items"("work_order_id");
ALTER TABLE "work_order_items" ADD CONSTRAINT "work_order_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "work_order_materials" (
    "id" TEXT NOT NULL,
    "work_order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "bobina_id" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "notes" TEXT,
    CONSTRAINT "work_order_materials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "work_order_materials_work_order_id_idx" ON "work_order_materials"("work_order_id");
ALTER TABLE "work_order_materials" ADD CONSTRAINT "work_order_materials_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_order_materials" ADD CONSTRAINT "work_order_materials_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_materials" ADD CONSTRAINT "work_order_materials_bobina_id_fkey" FOREIGN KEY ("bobina_id") REFERENCES "bobinas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
