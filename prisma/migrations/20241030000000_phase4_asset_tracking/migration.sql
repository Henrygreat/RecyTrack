-- Phase 4: Asset & Warehouse Management Migration
--
-- This migration extends the Asset model for full ITAD operations
-- and adds warehouse location management capabilities.
--
-- All new columns are nullable or have safe defaults to preserve existing data.

-- ============================================
-- NEW ENUMS
-- ============================================

-- Asset Category enum (replacing free-text category)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssetCategory') THEN
        CREATE TYPE "AssetCategory" AS ENUM (
            'LAPTOP', 'DESKTOP', 'SERVER', 'MONITOR', 'MOBILE_PHONE',
            'TABLET', 'PRINTER', 'NETWORKING', 'STORAGE_DEVICE',
            'UPS_BATTERY', 'PERIPHERAL', 'CABLE_ACCESSORY', 'OTHER'
        );
    END IF;
END $$;

-- Physical Condition enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PhysicalCondition') THEN
        CREATE TYPE "PhysicalCondition" AS ENUM (
            'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'FOR_PARTS'
        );
    END IF;
END $$;

-- Functional Condition enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FunctionalCondition') THEN
        CREATE TYPE "FunctionalCondition" AS ENUM (
            'WORKING', 'PARTIAL', 'NOT_WORKING', 'UNTESTED'
        );
    END IF;
END $$;

-- Data Bearing Status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DataBearingStatus') THEN
        CREATE TYPE "DataBearingStatus" AS ENUM (
            'NOT_APPLICABLE', 'NOT_ASSESSED', 'DATA_PRESENT',
            'WIPED_STANDARD', 'WIPED_CERTIFIED', 'PHYSICALLY_DESTROYED'
        );
    END IF;
END $$;

-- Disposition Outcome enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DispositionOutcome') THEN
        CREATE TYPE "DispositionOutcome" AS ENUM (
            'PENDING', 'RESALE', 'DONATION', 'RECYCLE', 'DESTROY', 'RETURN'
        );
    END IF;
END $$;

-- ============================================
-- EXTEND ASSET STATUS ENUM
-- ============================================

-- Add new asset status values for ITAD workflow
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'PROCESSING' AFTER 'DATA_ERASURE';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'READY' AFTER 'PROCESSING';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'LISTED' AFTER 'READY';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'SOLD' AFTER 'LISTED';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'RECYCLED' AFTER 'SOLD';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'DESTROYED' AFTER 'RECYCLED';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'RETURNED' AFTER 'DESTROYED';

-- ============================================
-- WAREHOUSE LOCATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "WarehouseLocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "locationType" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarehouseLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseLocation_organizationId_code_key"
    ON "WarehouseLocation"("organizationId", "code");

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseLocation_id_organizationId_key"
    ON "WarehouseLocation"("id", "organizationId");

CREATE INDEX IF NOT EXISTS "WarehouseLocation_organizationId_isActive_idx"
    ON "WarehouseLocation"("organizationId", "isActive");

ALTER TABLE "WarehouseLocation"
    ADD CONSTRAINT "WarehouseLocation_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- ASSET TABLE EXTENSIONS
-- ============================================

-- Make collectionId nullable (was required before)
ALTER TABLE "Asset" ALTER COLUMN "collectionId" DROP NOT NULL;

-- Add new identifier columns
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "qrCode" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "customerAssetTag" TEXT;

-- Add direct customer and site relationships
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "siteId" TEXT;

-- Convert category from TEXT to enum (need to handle existing data)
-- First, add a new column with the enum type
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "categoryEnum" "AssetCategory" DEFAULT 'OTHER';

-- Migrate existing category values to the new enum column
UPDATE "Asset" SET "categoryEnum" =
    CASE
        WHEN UPPER("category") LIKE '%LAPTOP%' THEN 'LAPTOP'::"AssetCategory"
        WHEN UPPER("category") LIKE '%DESKTOP%' THEN 'DESKTOP'::"AssetCategory"
        WHEN UPPER("category") LIKE '%SERVER%' THEN 'SERVER'::"AssetCategory"
        WHEN UPPER("category") LIKE '%MONITOR%' OR UPPER("category") LIKE '%DISPLAY%' THEN 'MONITOR'::"AssetCategory"
        WHEN UPPER("category") LIKE '%PHONE%' OR UPPER("category") LIKE '%MOBILE%' THEN 'MOBILE_PHONE'::"AssetCategory"
        WHEN UPPER("category") LIKE '%TABLET%' OR UPPER("category") LIKE '%IPAD%' THEN 'TABLET'::"AssetCategory"
        WHEN UPPER("category") LIKE '%PRINT%' THEN 'PRINTER'::"AssetCategory"
        WHEN UPPER("category") LIKE '%NETWORK%' OR UPPER("category") LIKE '%SWITCH%' OR UPPER("category") LIKE '%ROUTER%' THEN 'NETWORKING'::"AssetCategory"
        WHEN UPPER("category") LIKE '%STORAGE%' OR UPPER("category") LIKE '%NAS%' OR UPPER("category") LIKE '%SAN%' THEN 'STORAGE_DEVICE'::"AssetCategory"
        WHEN UPPER("category") LIKE '%UPS%' OR UPPER("category") LIKE '%BATTERY%' THEN 'UPS_BATTERY'::"AssetCategory"
        WHEN UPPER("category") LIKE '%KEYBOARD%' OR UPPER("category") LIKE '%MOUSE%' OR UPPER("category") LIKE '%PERIPHERAL%' THEN 'PERIPHERAL'::"AssetCategory"
        WHEN UPPER("category") LIKE '%CABLE%' THEN 'CABLE_ACCESSORY'::"AssetCategory"
        ELSE 'OTHER'::"AssetCategory"
    END
WHERE "categoryEnum" IS NULL OR "categoryEnum" = 'OTHER'::"AssetCategory";

-- Rename old category column and new one
ALTER TABLE "Asset" RENAME COLUMN "category" TO "categoryOther";
ALTER TABLE "Asset" RENAME COLUMN "categoryEnum" TO "category";

-- Add device specifications (JSON)
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "specifications" JSONB;

-- Add condition assessment columns
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "physicalCondition" "PhysicalCondition" DEFAULT 'FAIR';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "functionalCondition" "FunctionalCondition" DEFAULT 'UNTESTED';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "conditionNotes" TEXT;

-- Add data handling columns
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dataBearingStatus" "DataBearingStatus" DEFAULT 'NOT_ASSESSED';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "storageType" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "storageCapacity" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dataWipeMethod" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dataWipeDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dataWipeCertificate" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dataWipeOperator" TEXT;

-- Add photos array
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "photos" TEXT[] DEFAULT '{}';

-- Add timestamp columns
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "collectedAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "inspectedAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3);

-- Add warehouse location columns
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "warehouseLocationId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "binLocation" TEXT;

-- Add assignment columns
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "assignedOperatorId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "assignedOperatorName" TEXT;

-- Add valuation columns
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "estimatedValue" DECIMAL(10, 2);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "actualSalePrice" DECIMAL(10, 2);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "weight" DECIMAL(8, 3);

-- Add disposition columns
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dispositionOutcome" "DispositionOutcome" DEFAULT 'PENDING';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dispositionDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dispositionNotes" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "buyerName" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "buyerReference" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "recyclingPartner" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "recyclingCertificate" TEXT;

-- Add metadata columns
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "createdByName" TEXT;

-- ============================================
-- ASSET TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS "Asset_organizationId_status_idx"
    ON "Asset"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "Asset_organizationId_category_idx"
    ON "Asset"("organizationId", "category");

CREATE INDEX IF NOT EXISTS "Asset_collectionId_idx"
    ON "Asset"("collectionId");

CREATE INDEX IF NOT EXISTS "Asset_customerId_idx"
    ON "Asset"("customerId");

CREATE INDEX IF NOT EXISTS "Asset_warehouseLocationId_idx"
    ON "Asset"("warehouseLocationId");

CREATE INDEX IF NOT EXISTS "Asset_organizationId_createdAt_idx"
    ON "Asset"("organizationId", "createdAt");

-- ============================================
-- ASSET COMPOSITE UNIQUE INDEX (REQUIRED FOR FKs)
-- ============================================

-- This unique index is required for multi-tenant foreign key references.
-- AssetNote and AssetStatusChange reference Asset(id, organizationId).
-- PostgreSQL requires a unique constraint on the referenced columns.
-- Must be created BEFORE any FK that references Asset(id, organizationId).
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_id_organizationId_key"
    ON "Asset"("id", "organizationId");

-- ============================================
-- ASSET TABLE FOREIGN KEYS
-- ============================================

-- Add foreign key for customer relationship
ALTER TABLE "Asset"
    ADD CONSTRAINT "Asset_customerId_organizationId_fkey"
    FOREIGN KEY ("customerId", "organizationId")
    REFERENCES "Customer"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key for site relationship
ALTER TABLE "Asset"
    ADD CONSTRAINT "Asset_siteId_organizationId_fkey"
    FOREIGN KEY ("siteId", "organizationId")
    REFERENCES "Site"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key for warehouse location relationship
ALTER TABLE "Asset"
    ADD CONSTRAINT "Asset_warehouseLocationId_organizationId_fkey"
    FOREIGN KEY ("warehouseLocationId", "organizationId")
    REFERENCES "WarehouseLocation"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- ASSET NOTE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "AssetNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "noteType" TEXT NOT NULL DEFAULT 'general',
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssetNote_assetId_idx"
    ON "AssetNote"("assetId");

CREATE INDEX IF NOT EXISTS "AssetNote_organizationId_createdAt_idx"
    ON "AssetNote"("organizationId", "createdAt");

ALTER TABLE "AssetNote"
    ADD CONSTRAINT "AssetNote_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetNote"
    ADD CONSTRAINT "AssetNote_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId")
    REFERENCES "Asset"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- ASSET STATUS CHANGE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "AssetStatusChange" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "fromStatus" "AssetStatus",
    "toStatus" "AssetStatus" NOT NULL,
    "changedByUserId" TEXT,
    "changedByName" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetStatusChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssetStatusChange_assetId_idx"
    ON "AssetStatusChange"("assetId");

CREATE INDEX IF NOT EXISTS "AssetStatusChange_organizationId_createdAt_idx"
    ON "AssetStatusChange"("organizationId", "createdAt");

ALTER TABLE "AssetStatusChange"
    ADD CONSTRAINT "AssetStatusChange_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetStatusChange"
    ADD CONSTRAINT "AssetStatusChange_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId")
    REFERENCES "Asset"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    -- Verify Asset.category is now an enum
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Asset' AND column_name = 'category'
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: Asset.category column not found';
    END IF;

    -- Verify WarehouseLocation table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'WarehouseLocation'
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: WarehouseLocation table not found';
    END IF;

    -- Verify AssetNote table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'AssetNote'
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: AssetNote table not found';
    END IF;

    -- Verify AssetStatusChange table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'AssetStatusChange'
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: AssetStatusChange table not found';
    END IF;

    RAISE NOTICE 'Phase 4 migration verification passed';
END $$;
