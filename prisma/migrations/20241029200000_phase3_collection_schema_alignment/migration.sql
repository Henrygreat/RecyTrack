-- Phase 3: Collection Schema Alignment Migration
--
-- This migration brings the production database into alignment with the Prisma schema.
-- All new columns are nullable or have safe defaults to preserve existing data.
--
-- Fixes P2022: The column Collection.siteId does not exist in the current database.

-- ============================================
-- NEW ENUMS
-- ============================================

-- Create CollectionPriority enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CollectionPriority') THEN
        CREATE TYPE "CollectionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
    END IF;
END $$;

-- Create CollectionType enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CollectionType') THEN
        CREATE TYPE "CollectionType" AS ENUM ('STANDARD', 'SECURE_DATA', 'HAZARDOUS', 'LARGE_ITEMS', 'MIXED');
    END IF;
END $$;

-- ============================================
-- COLLECTION TABLE EXTENSIONS
-- ============================================

-- Site relationship (nullable - existing collections have no site)
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "siteId" TEXT;

-- Collection type and priority with safe defaults
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "collectionType" "CollectionType" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "priority" "CollectionPriority" NOT NULL DEFAULT 'NORMAL';

-- Scheduling
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "scheduledDate" DATE;

-- Contact information (nullable)
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;

-- Equipment details
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "equipmentCategories" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "actualItemCount" INTEGER;

-- Instructions (nullable)
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "specialHandling" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "customerInstructions" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;

-- Driver assignment
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "driverId" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "vehicleReg" TEXT;

-- Status timestamps (nullable)
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

-- Exception handling (nullable)
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "exceptionReason" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "exceptionNotes" TEXT;

-- Proof of collection (nullable)
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "signatureName" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "signatureData" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "proofPhotos" TEXT[] NOT NULL DEFAULT '{}';

-- ============================================
-- COLLECTION INDEXES
-- ============================================

-- Scheduling index
CREATE INDEX IF NOT EXISTS "Collection_organizationId_scheduledDate_idx"
    ON "Collection"("organizationId", "scheduledDate");

-- Driver assignment index
CREATE INDEX IF NOT EXISTS "Collection_driverId_status_idx"
    ON "Collection"("driverId", "status");

-- Customer collections index
CREATE INDEX IF NOT EXISTS "Collection_customerId_status_idx"
    ON "Collection"("customerId", "status");

-- ============================================
-- COLLECTION FOREIGN KEY FOR SITE
-- ============================================

-- Add foreign key constraint for siteId
-- Uses composite key for multi-tenant isolation
ALTER TABLE "Collection"
    ADD CONSTRAINT "Collection_siteId_organizationId_fkey"
    FOREIGN KEY ("siteId", "organizationId")
    REFERENCES "Site"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- COLLECTION STATUS CHANGE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CollectionStatusChange" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromStatus" "CollectionStatus",
    "toStatus" "CollectionStatus" NOT NULL,
    "changedByUserId" TEXT,
    "changedByName" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionStatusChange_pkey" PRIMARY KEY ("id")
);

-- Status change indexes
CREATE INDEX IF NOT EXISTS "CollectionStatusChange_collectionId_idx"
    ON "CollectionStatusChange"("collectionId");

CREATE INDEX IF NOT EXISTS "CollectionStatusChange_organizationId_createdAt_idx"
    ON "CollectionStatusChange"("organizationId", "createdAt");

-- Status change foreign key
ALTER TABLE "CollectionStatusChange"
    ADD CONSTRAINT "CollectionStatusChange_collectionId_organizationId_fkey"
    FOREIGN KEY ("collectionId", "organizationId")
    REFERENCES "Collection"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CUSTOMER INVITATION EMAIL TRACKING
-- ============================================

-- Email delivery tracking columns
ALTER TABLE "CustomerInvitation" ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP(3);
ALTER TABLE "CustomerInvitation" ADD COLUMN IF NOT EXISTS "emailMessageId" TEXT;
ALTER TABLE "CustomerInvitation" ADD COLUMN IF NOT EXISTS "emailDeliveredAt" TIMESTAMP(3);
ALTER TABLE "CustomerInvitation" ADD COLUMN IF NOT EXISTS "emailFailedAt" TIMESTAMP(3);
ALTER TABLE "CustomerInvitation" ADD COLUMN IF NOT EXISTS "emailFailureReason" TEXT;
ALTER TABLE "CustomerInvitation" ADD COLUMN IF NOT EXISTS "lastResendAt" TIMESTAMP(3);
ALTER TABLE "CustomerInvitation" ADD COLUMN IF NOT EXISTS "resendCount" INTEGER NOT NULL DEFAULT 0;

-- Email message ID index for webhook lookups
CREATE INDEX IF NOT EXISTS "CustomerInvitation_emailMessageId_idx"
    ON "CustomerInvitation"("emailMessageId");

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify Collection.siteId column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Collection' AND column_name = 'siteId'
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: Collection.siteId column was not created';
    END IF;
    RAISE NOTICE 'Migration verification passed: Collection.siteId exists';
END $$;
