-- Phase 4.3 & 4.4: Asset Lifecycle, Inspections & Chain of Custody
--
-- This migration adds:
-- - Inspection management with configurable templates
-- - Condition grading system (A-F)
-- - Quarantine management
-- - Chain of custody tracking
-- - Custody exceptions management
--
-- All changes are additive and backward-compatible.
-- Uses idempotent patterns (IF NOT EXISTS, IF EXISTS checks).

-- ============================================
-- NEW ENUMS
-- ============================================

-- Inspection Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InspectionStatus') THEN
        CREATE TYPE "InspectionStatus" AS ENUM (
            'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'
        );
    END IF;
END $$;

-- Inspection Type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InspectionType') THEN
        CREATE TYPE "InspectionType" AS ENUM (
            'RECEIVING', 'PERIODIC', 'PRE_SALE', 'RANDOM',
            'QUALITY_CONTROL', 'CUSTOMER_REQUEST', 'POST_REPAIR'
        );
    END IF;
END $$;

-- Condition Grade (A-F)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConditionGrade') THEN
        CREATE TYPE "ConditionGrade" AS ENUM (
            'A', 'B', 'C', 'D', 'F'
        );
    END IF;
END $$;

-- Quarantine Reason
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuarantineReason') THEN
        CREATE TYPE "QuarantineReason" AS ENUM (
            'DAMAGE', 'DATA_SECURITY', 'INVESTIGATION', 'COMPLIANCE',
            'CUSTOMER_REQUEST', 'SUSPECTED_STOLEN', 'HAZARDOUS', 'OTHER'
        );
    END IF;
END $$;

-- Quarantine Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuarantineStatus') THEN
        CREATE TYPE "QuarantineStatus" AS ENUM (
            'ACTIVE', 'RELEASED', 'DISPOSED'
        );
    END IF;
END $$;

-- Custody Event Type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustodyEventType') THEN
        CREATE TYPE "CustodyEventType" AS ENUM (
            'COLLECTION', 'VEHICLE_LOADING', 'VEHICLE_UNLOADING',
            'WAREHOUSE_RECEIPT', 'INTERNAL_TRANSFER', 'INSPECTION_HANDOVER',
            'QUARANTINE_TRANSFER', 'PROCESSING_HANDOVER', 'EXTERNAL_DISPATCH',
            'FINAL_HANDOVER'
        );
    END IF;
END $$;

-- Handover Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HandoverStatus') THEN
        CREATE TYPE "HandoverStatus" AS ENUM (
            'PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED'
        );
    END IF;
END $$;

-- Custody Exception Type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustodyExceptionType') THEN
        CREATE TYPE "CustodyExceptionType" AS ENUM (
            'MISSING_CUSTODIAN', 'UNCONFIRMED_HANDOVER', 'UNEXPECTED_LOCATION',
            'MISSING_RECEIPT', 'UNAUTHORIZED_TRANSFER', 'CUSTODY_DISCREPANCY',
            'ASSET_NOT_FOUND'
        );
    END IF;
END $$;

-- Custody Exception Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustodyExceptionStatus') THEN
        CREATE TYPE "CustodyExceptionStatus" AS ENUM (
            'OPEN', 'INVESTIGATING', 'RESOLVED', 'ESCALATED'
        );
    END IF;
END $$;

-- ============================================
-- EXTEND ASSET STATUS ENUM (add QUARANTINED)
-- ============================================

-- Add QUARANTINED status if not exists
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'QUARANTINED' AFTER 'INSPECTION';

-- ============================================
-- EXTEND ASSET TABLE (condition grading)
-- ============================================

-- Add condition grade columns to Asset
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "conditionGrade" "ConditionGrade";
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "conditionGradeNotes" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "conditionGradedBy" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "conditionGradedAt" TIMESTAMP(3);

-- ============================================
-- INSPECTION TEMPLATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "InspectionTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "AssetCategory" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "InspectionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InspectionTemplate_organizationId_name_version_key"
    ON "InspectionTemplate"("organizationId", "name", "version");

CREATE INDEX IF NOT EXISTS "InspectionTemplate_organizationId_category_isActive_idx"
    ON "InspectionTemplate"("organizationId", "category", "isActive");

ALTER TABLE "InspectionTemplate" DROP CONSTRAINT IF EXISTS "InspectionTemplate_organizationId_fkey";
ALTER TABLE "InspectionTemplate"
    ADD CONSTRAINT "InspectionTemplate_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- INSPECTION TEMPLATE ITEM TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "InspectionTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "itemType" TEXT NOT NULL DEFAULT 'checkbox',
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InspectionTemplateItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InspectionTemplateItem_templateId_sortOrder_idx"
    ON "InspectionTemplateItem"("templateId", "sortOrder");

ALTER TABLE "InspectionTemplateItem" DROP CONSTRAINT IF EXISTS "InspectionTemplateItem_templateId_fkey";
ALTER TABLE "InspectionTemplateItem"
    ADD CONSTRAINT "InspectionTemplateItem_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- INSPECTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "Inspection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "templateId" TEXT,
    "inspectionType" "InspectionType" NOT NULL DEFAULT 'RECEIVING',
    "status" "InspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "templateSnapshot" JSONB,
    "inspectorUserId" TEXT,
    "inspectorName" TEXT,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetCategory" "AssetCategory",
    "assetManufacturer" TEXT,
    "assetModel" TEXT,
    "assetSerialNumber" TEXT,
    "physicalCondition" "PhysicalCondition",
    "functionalCondition" "FunctionalCondition",
    "conditionGrade" "ConditionGrade",
    "gradeRationale" TEXT,
    "findings" TEXT,
    "recommendedAction" TEXT,
    "inspectorComments" TEXT,
    "checklistResponses" JSONB,
    "photos" TEXT[] DEFAULT '{}',
    "attachments" JSONB,
    "submittedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Inspection_organizationId_reference_key"
    ON "Inspection"("organizationId", "reference");

CREATE UNIQUE INDEX IF NOT EXISTS "Inspection_id_organizationId_key"
    ON "Inspection"("id", "organizationId");

CREATE INDEX IF NOT EXISTS "Inspection_assetId_idx"
    ON "Inspection"("assetId");

CREATE INDEX IF NOT EXISTS "Inspection_organizationId_status_idx"
    ON "Inspection"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "Inspection_organizationId_inspectionDate_idx"
    ON "Inspection"("organizationId", "inspectionDate");

CREATE INDEX IF NOT EXISTS "Inspection_inspectorUserId_idx"
    ON "Inspection"("inspectorUserId");

ALTER TABLE "Inspection" DROP CONSTRAINT IF EXISTS "Inspection_organizationId_fkey";
ALTER TABLE "Inspection"
    ADD CONSTRAINT "Inspection_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Inspection" DROP CONSTRAINT IF EXISTS "Inspection_assetId_organizationId_fkey";
ALTER TABLE "Inspection"
    ADD CONSTRAINT "Inspection_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId")
    REFERENCES "Asset"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Inspection" DROP CONSTRAINT IF EXISTS "Inspection_templateId_fkey";
ALTER TABLE "Inspection"
    ADD CONSTRAINT "Inspection_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- INSPECTION REVISION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "InspectionRevision" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "revisionNum" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "revisedBy" TEXT,
    "revisedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InspectionRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InspectionRevision_inspectionId_revisionNum_key"
    ON "InspectionRevision"("inspectionId", "revisionNum");

CREATE INDEX IF NOT EXISTS "InspectionRevision_inspectionId_idx"
    ON "InspectionRevision"("inspectionId");

ALTER TABLE "InspectionRevision" DROP CONSTRAINT IF EXISTS "InspectionRevision_inspectionId_fkey";
ALTER TABLE "InspectionRevision"
    ADD CONSTRAINT "InspectionRevision_inspectionId_fkey"
    FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- ASSET QUARANTINE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "AssetQuarantine" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "reason" "QuarantineReason" NOT NULL,
    "status" "QuarantineStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "assignedToUserId" TEXT,
    "assignedToName" TEXT,
    "quarantineLocationId" TEXT,
    "previousLocationId" TEXT,
    "resolutionAction" TEXT,
    "resolutionNotes" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedByName" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "releaseApprovedBy" TEXT,
    "releaseApprovedByName" TEXT,
    "releaseApprovedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "AssetQuarantine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AssetQuarantine_id_organizationId_key"
    ON "AssetQuarantine"("id", "organizationId");

CREATE INDEX IF NOT EXISTS "AssetQuarantine_assetId_idx"
    ON "AssetQuarantine"("assetId");

CREATE INDEX IF NOT EXISTS "AssetQuarantine_organizationId_status_idx"
    ON "AssetQuarantine"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "AssetQuarantine_organizationId_reason_idx"
    ON "AssetQuarantine"("organizationId", "reason");

CREATE INDEX IF NOT EXISTS "AssetQuarantine_assignedToUserId_idx"
    ON "AssetQuarantine"("assignedToUserId");

ALTER TABLE "AssetQuarantine" DROP CONSTRAINT IF EXISTS "AssetQuarantine_organizationId_fkey";
ALTER TABLE "AssetQuarantine"
    ADD CONSTRAINT "AssetQuarantine_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetQuarantine" DROP CONSTRAINT IF EXISTS "AssetQuarantine_assetId_organizationId_fkey";
ALTER TABLE "AssetQuarantine"
    ADD CONSTRAINT "AssetQuarantine_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId")
    REFERENCES "Asset"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CUSTODY EVENT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CustodyEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "eventType" "CustodyEventType" NOT NULL,
    "handoverStatus" "HandoverStatus" NOT NULL DEFAULT 'PENDING',
    "fromCustodianUserId" TEXT,
    "fromCustodianName" TEXT,
    "fromCustodianType" TEXT,
    "toCustodianUserId" TEXT,
    "toCustodianName" TEXT,
    "toCustodianType" TEXT,
    "fromLocationId" TEXT,
    "fromLocationName" TEXT,
    "toLocationId" TEXT,
    "toLocationName" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initiatedByUserId" TEXT,
    "initiatedByName" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedByUserId" TEXT,
    "confirmedByName" TEXT,
    "confirmationMethod" TEXT,
    "signatureData" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedByName" TEXT,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "photos" TEXT[] DEFAULT '{}',
    "attachments" JSONB,
    "collectionId" TEXT,
    "inspectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustodyEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustodyEvent_organizationId_reference_key"
    ON "CustodyEvent"("organizationId", "reference");

CREATE UNIQUE INDEX IF NOT EXISTS "CustodyEvent_id_organizationId_key"
    ON "CustodyEvent"("id", "organizationId");

CREATE INDEX IF NOT EXISTS "CustodyEvent_assetId_idx"
    ON "CustodyEvent"("assetId");

CREATE INDEX IF NOT EXISTS "CustodyEvent_organizationId_eventDate_idx"
    ON "CustodyEvent"("organizationId", "eventDate");

CREATE INDEX IF NOT EXISTS "CustodyEvent_organizationId_handoverStatus_idx"
    ON "CustodyEvent"("organizationId", "handoverStatus");

CREATE INDEX IF NOT EXISTS "CustodyEvent_fromCustodianUserId_idx"
    ON "CustodyEvent"("fromCustodianUserId");

CREATE INDEX IF NOT EXISTS "CustodyEvent_toCustodianUserId_idx"
    ON "CustodyEvent"("toCustodianUserId");

ALTER TABLE "CustodyEvent" DROP CONSTRAINT IF EXISTS "CustodyEvent_organizationId_fkey";
ALTER TABLE "CustodyEvent"
    ADD CONSTRAINT "CustodyEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustodyEvent" DROP CONSTRAINT IF EXISTS "CustodyEvent_assetId_organizationId_fkey";
ALTER TABLE "CustodyEvent"
    ADD CONSTRAINT "CustodyEvent_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId")
    REFERENCES "Asset"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CUSTODY EXCEPTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CustodyException" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "exceptionType" "CustodyExceptionType" NOT NULL,
    "status" "CustodyExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedByUserId" TEXT,
    "detectedByName" TEXT,
    "relatedCustodyEventId" TEXT,
    "expectedValue" TEXT,
    "actualValue" TEXT,
    "investigationNotes" TEXT,
    "investigatedByUserId" TEXT,
    "investigatedByName" TEXT,
    "resolutionNotes" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedByName" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "escalatedAt" TIMESTAMP(3),
    "escalatedToUserId" TEXT,
    "escalatedToName" TEXT,
    "escalationReason" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustodyException_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustodyException_organizationId_reference_key"
    ON "CustodyException"("organizationId", "reference");

CREATE UNIQUE INDEX IF NOT EXISTS "CustodyException_id_organizationId_key"
    ON "CustodyException"("id", "organizationId");

CREATE INDEX IF NOT EXISTS "CustodyException_assetId_idx"
    ON "CustodyException"("assetId");

CREATE INDEX IF NOT EXISTS "CustodyException_organizationId_status_idx"
    ON "CustodyException"("organizationId", "status");

CREATE INDEX IF NOT EXISTS "CustodyException_organizationId_exceptionType_idx"
    ON "CustodyException"("organizationId", "exceptionType");

CREATE INDEX IF NOT EXISTS "CustodyException_organizationId_priority_idx"
    ON "CustodyException"("organizationId", "priority");

ALTER TABLE "CustodyException" DROP CONSTRAINT IF EXISTS "CustodyException_organizationId_fkey";
ALTER TABLE "CustodyException"
    ADD CONSTRAINT "CustodyException_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustodyException" DROP CONSTRAINT IF EXISTS "CustodyException_assetId_organizationId_fkey";
ALTER TABLE "CustodyException"
    ADD CONSTRAINT "CustodyException_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId")
    REFERENCES "Asset"("id", "organizationId")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    -- Verify new enums exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InspectionStatus') THEN
        RAISE EXCEPTION 'Migration verification failed: InspectionStatus enum not found';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustodyEventType') THEN
        RAISE EXCEPTION 'Migration verification failed: CustodyEventType enum not found';
    END IF;

    -- Verify new tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Inspection') THEN
        RAISE EXCEPTION 'Migration verification failed: Inspection table not found';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'InspectionTemplate') THEN
        RAISE EXCEPTION 'Migration verification failed: InspectionTemplate table not found';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AssetQuarantine') THEN
        RAISE EXCEPTION 'Migration verification failed: AssetQuarantine table not found';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CustodyEvent') THEN
        RAISE EXCEPTION 'Migration verification failed: CustodyEvent table not found';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CustodyException') THEN
        RAISE EXCEPTION 'Migration verification failed: CustodyException table not found';
    END IF;

    -- Verify Asset table extensions
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Asset' AND column_name = 'conditionGrade'
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: Asset.conditionGrade column not found';
    END IF;

    RAISE NOTICE 'Phase 4.3 & 4.4 migration verification passed';
END $$;
