-- Phase 4.5: QR Scanning, Labels & Bulk Operations - Stocktake System
--
-- This migration adds:
-- - Stocktake session management
-- - Stocktake item tracking
-- - Support for inventory reconciliation
--
-- All changes are additive and backward-compatible.
-- Uses idempotent patterns (IF NOT EXISTS, IF EXISTS checks).

-- ============================================
-- NEW ENUMS
-- ============================================

-- Stocktake Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StocktakeStatus') THEN
        CREATE TYPE "StocktakeStatus" AS ENUM (
            'IN_PROGRESS', 'PAUSED', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED'
        );
    END IF;
END $$;

-- Stocktake Item Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StocktakeItemStatus') THEN
        CREATE TYPE "StocktakeItemStatus" AS ENUM (
            'EXPECTED', 'FOUND', 'MISSING', 'UNEXPECTED', 'DISCREPANCY'
        );
    END IF;
END $$;

-- ============================================
-- STOCKTAKE SESSION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "StocktakeSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "StocktakeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "warehouseLocationId" TEXT,
    "includeAllLocations" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pausedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "startedByUserId" TEXT,
    "startedByName" TEXT,
    "completedByUserId" TEXT,
    "completedByName" TEXT,
    "expectedCount" INTEGER NOT NULL DEFAULT 0,
    "scannedCount" INTEGER NOT NULL DEFAULT 0,
    "foundCount" INTEGER NOT NULL DEFAULT 0,
    "missingCount" INTEGER NOT NULL DEFAULT 0,
    "unexpectedCount" INTEGER NOT NULL DEFAULT 0,
    "reconciliationNotes" TEXT,
    "approvedByUserId" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StocktakeSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StocktakeSession_organizationId_reference_key"
    ON "StocktakeSession"("organizationId", "reference");

CREATE UNIQUE INDEX IF NOT EXISTS "StocktakeSession_id_organizationId_key"
    ON "StocktakeSession"("id", "organizationId");

CREATE INDEX IF NOT EXISTS "StocktakeSession_organizationId_status_idx"
    ON "StocktakeSession"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "StocktakeSession_organizationId_startedAt_idx"
    ON "StocktakeSession"("organizationId", "startedAt");

CREATE INDEX IF NOT EXISTS "StocktakeSession_warehouseLocationId_idx"
    ON "StocktakeSession"("warehouseLocationId");

ALTER TABLE "StocktakeSession" DROP CONSTRAINT IF EXISTS "StocktakeSession_organizationId_fkey";
ALTER TABLE "StocktakeSession"
    ADD CONSTRAINT "StocktakeSession_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StocktakeSession" DROP CONSTRAINT IF EXISTS "StocktakeSession_warehouseLocationId_organizationId_fkey";
ALTER TABLE "StocktakeSession"
    ADD CONSTRAINT "StocktakeSession_warehouseLocationId_organizationId_fkey"
    FOREIGN KEY ("warehouseLocationId", "organizationId")
    REFERENCES "WarehouseLocation"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- STOCKTAKE ITEM TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "StocktakeItem" (
    "id" TEXT NOT NULL,
    "stocktakeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "status" "StocktakeItemStatus" NOT NULL DEFAULT 'EXPECTED',
    "expectedLocationId" TEXT,
    "expectedLocationCode" TEXT,
    "actualLocationId" TEXT,
    "actualLocationCode" TEXT,
    "scannedAt" TIMESTAMP(3),
    "scannedByUserId" TEXT,
    "scannedByName" TEXT,
    "scanMethod" TEXT,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "lastScanAt" TIMESTAMP(3),
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "discrepancyType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StocktakeItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StocktakeItem_stocktakeId_assetId_key"
    ON "StocktakeItem"("stocktakeId", "assetId");

CREATE INDEX IF NOT EXISTS "StocktakeItem_stocktakeId_status_idx"
    ON "StocktakeItem"("stocktakeId", "status");

CREATE INDEX IF NOT EXISTS "StocktakeItem_assetId_idx"
    ON "StocktakeItem"("assetId");

ALTER TABLE "StocktakeItem" DROP CONSTRAINT IF EXISTS "StocktakeItem_stocktakeId_fkey";
ALTER TABLE "StocktakeItem"
    ADD CONSTRAINT "StocktakeItem_stocktakeId_fkey"
    FOREIGN KEY ("stocktakeId") REFERENCES "StocktakeSession"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    -- Verify new enums exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StocktakeStatus') THEN
        RAISE EXCEPTION 'Migration verification failed: StocktakeStatus enum not found';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StocktakeItemStatus') THEN
        RAISE EXCEPTION 'Migration verification failed: StocktakeItemStatus enum not found';
    END IF;

    -- Verify new tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'StocktakeSession') THEN
        RAISE EXCEPTION 'Migration verification failed: StocktakeSession table not found';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'StocktakeItem') THEN
        RAISE EXCEPTION 'Migration verification failed: StocktakeItem table not found';
    END IF;

    RAISE NOTICE 'Phase 4.5 stocktake migration verification passed';
END $$;
