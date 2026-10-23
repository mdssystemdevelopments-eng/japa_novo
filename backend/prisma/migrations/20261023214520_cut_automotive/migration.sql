-- CreateEnum
CREATE TYPE "CutApplicationType" AS ENUM ('INSULFILM', 'PPF', 'BOTH');

-- CreateEnum
CREATE TYPE "CutPieceCategory" AS ENUM ('WINDSHIELD', 'REAR_GLASS', 'FRONT_SIDE_LEFT', 'FRONT_SIDE_RIGHT', 'REAR_SIDE_LEFT', 'REAR_SIDE_RIGHT', 'FIXED_GLASS', 'HOOD', 'FENDER', 'BUMPER', 'DOOR', 'MIRROR', 'OTHER');

-- CreateEnum
CREATE TYPE "CutPatternStatus" AS ENUM ('IMPORTED', 'DRAFT', 'PENDING_VALIDATION', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CutJobStatus" AS ENUM ('DRAFT', 'PREPARED', 'NESTED', 'READY_EXPORT', 'SIMULATED', 'SENT', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CutPlotterIntegrationMode" AS ENUM ('FILE_EXPORT_ONLY', 'SIMULATION');

-- CreateEnum
CREATE TYPE "CutJobFilePurpose" AS ENUM ('EXPORT', 'PREVIEW', 'DIAGNOSTIC');

-- DropIndex
DROP INDEX "vehicles_plate_idx";

-- AlterTable
ALTER TABLE "goods_receipts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "cut_vehicle_catalog" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year_from" INTEGER,
    "year_to" INTEGER,
    "generation" TEXT,
    "version" TEXT,
    "body_type" TEXT,
    "application_types" "CutApplicationType"[] DEFAULT ARRAY['INSULFILM']::"CutApplicationType"[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cut_vehicle_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_patterns" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "piece_category" "CutPieceCategory" NOT NULL,
    "application_type" "CutApplicationType" NOT NULL DEFAULT 'INSULFILM',
    "status" "CutPatternStatus" NOT NULL DEFAULT 'IMPORTED',
    "unit" TEXT NOT NULL DEFAULT 'mm',
    "width_mm" DECIMAL(18,4) NOT NULL,
    "height_mm" DECIMAL(18,4) NOT NULL,
    "geometry" JSONB NOT NULL,
    "svg_source" TEXT,
    "origin" TEXT,
    "license_ref" TEXT,
    "rotation_allowed" BOOLEAN NOT NULL DEFAULT true,
    "max_rotation_deg" INTEGER NOT NULL DEFAULT 180,
    "margin_mm" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "validated_at" TIMESTAMP(3),
    "validated_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cut_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_pattern_versions" (
    "id" TEXT NOT NULL,
    "pattern_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "geometry" JSONB NOT NULL,
    "change_notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cut_pattern_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_pattern_catalog_links" (
    "id" TEXT NOT NULL,
    "catalog_id" TEXT NOT NULL,
    "pattern_id" TEXT NOT NULL,

    CONSTRAINT "cut_pattern_catalog_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_plotter_profiles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "max_width_mm" DECIMAL(18,4) NOT NULL,
    "max_length_mm" DECIMAL(18,4),
    "accepted_formats" JSONB NOT NULL DEFAULT '["svg","dxf"]',
    "integration_mode" "CutPlotterIntegrationMode" NOT NULL DEFAULT 'FILE_EXPORT_ONLY',
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cut_plotter_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_jobs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "catalog_id" TEXT,
    "customer_id" TEXT,
    "vehicle_id" TEXT,
    "work_order_id" TEXT,
    "application_type" "CutApplicationType" NOT NULL,
    "material_product_id" TEXT,
    "plotter_profile_id" TEXT,
    "status" "CutJobStatus" NOT NULL DEFAULT 'DRAFT',
    "simulation_mode" BOOLEAN NOT NULL DEFAULT true,
    "material_width_mm" DECIMAL(18,4),
    "material_length_mm" DECIMAL(18,4),
    "utilization_pct" DECIMAL(8,4),
    "layout" JSONB,
    "operator_user_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cut_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_job_items" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "pattern_id" TEXT NOT NULL,
    "pattern_version" INTEGER NOT NULL,
    "piece_category" "CutPieceCategory" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "transform" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cut_job_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_job_files" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "purpose" "CutJobFilePurpose" NOT NULL DEFAULT 'EXPORT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cut_job_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cut_job_events" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cut_job_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cut_vehicle_catalog_company_id_manufacturer_model_idx" ON "cut_vehicle_catalog"("company_id", "manufacturer", "model");

-- CreateIndex
CREATE INDEX "cut_patterns_company_id_status_idx" ON "cut_patterns"("company_id", "status");

-- CreateIndex
CREATE INDEX "cut_patterns_company_id_piece_category_idx" ON "cut_patterns"("company_id", "piece_category");

-- CreateIndex
CREATE UNIQUE INDEX "cut_pattern_versions_pattern_id_version_key" ON "cut_pattern_versions"("pattern_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "cut_pattern_catalog_links_catalog_id_pattern_id_key" ON "cut_pattern_catalog_links"("catalog_id", "pattern_id");

-- CreateIndex
CREATE INDEX "cut_plotter_profiles_company_id_idx" ON "cut_plotter_profiles"("company_id");

-- CreateIndex
CREATE INDEX "cut_jobs_company_id_status_created_at_idx" ON "cut_jobs"("company_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "cut_job_items_job_id_idx" ON "cut_job_items"("job_id");

-- CreateIndex
CREATE INDEX "cut_job_files_job_id_idx" ON "cut_job_files"("job_id");

-- CreateIndex
CREATE INDEX "cut_job_events_job_id_created_at_idx" ON "cut_job_events"("job_id", "created_at");

-- AddForeignKey
ALTER TABLE "cut_vehicle_catalog" ADD CONSTRAINT "cut_vehicle_catalog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_patterns" ADD CONSTRAINT "cut_patterns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_pattern_versions" ADD CONSTRAINT "cut_pattern_versions_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "cut_patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_pattern_catalog_links" ADD CONSTRAINT "cut_pattern_catalog_links_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "cut_vehicle_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_pattern_catalog_links" ADD CONSTRAINT "cut_pattern_catalog_links_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "cut_patterns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_plotter_profiles" ADD CONSTRAINT "cut_plotter_profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_jobs" ADD CONSTRAINT "cut_jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_jobs" ADD CONSTRAINT "cut_jobs_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "cut_vehicle_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_jobs" ADD CONSTRAINT "cut_jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_jobs" ADD CONSTRAINT "cut_jobs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_jobs" ADD CONSTRAINT "cut_jobs_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_jobs" ADD CONSTRAINT "cut_jobs_material_product_id_fkey" FOREIGN KEY ("material_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_jobs" ADD CONSTRAINT "cut_jobs_plotter_profile_id_fkey" FOREIGN KEY ("plotter_profile_id") REFERENCES "cut_plotter_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_job_items" ADD CONSTRAINT "cut_job_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "cut_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_job_items" ADD CONSTRAINT "cut_job_items_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "cut_patterns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_job_files" ADD CONSTRAINT "cut_job_files_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "cut_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cut_job_events" ADD CONSTRAINT "cut_job_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "cut_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
