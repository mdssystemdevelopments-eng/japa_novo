-- AlterTable
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "phone_secondary" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "street" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "street_number" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "complement" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "district" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contact_origin" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "internal_notes" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "communication_preferences" JSONB;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "customers_company_id_phone_idx" ON "customers"("company_id", "phone");

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

DO $$ BEGIN
  ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
