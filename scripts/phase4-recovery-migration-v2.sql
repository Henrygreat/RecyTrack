-- ============================================
-- PHASE 4 RECOVERY MIGRATION v2
-- ============================================
--
-- This script safely recovers from the failed Phase 4 migration.
-- It handles partial state and creates objects in correct dependency order.
--
-- CRITICAL FIXES FROM v1:
-- 1. Uses ON DELETE RESTRICT (not SET NULL) for composite FKs
-- 2. Fully idempotent category migration with state detection
-- 3. Comprehensive prerequisite verification
-- 4. Handles ALTER TYPE outside transaction for PG < 12 compatibility
--
-- PREREQUISITES:
-- 1. Run phase4-pre-migration-validation.sql and verify all checks pass
-- 2. Create and verify a database backup
-- 3. Test this script on staging first
--
-- DO NOT RUN ON PRODUCTION WITHOUT TEAM REVIEW
-- ============================================

-- ============================================
-- STEP 0: PRE-FLIGHT CHECKS (READ-ONLY)
-- ============================================

\echo '========================================'
\echo 'PHASE 4 RECOVERY MIGRATION v2'
\echo '========================================'
\echo ''
\echo 'Step 0: Pre-flight verification...'

-- Verify prerequisite unique indexes exist
DO $$
BEGIN
    -- Customer_id_organizationId_key is required for Asset→Customer FK
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'Customer' AND indexname = 'Customer_id_organizationId_key'
    ) THEN
        RAISE EXCEPTION 'PREREQUISITE MISSING: Customer_id_organizationId_key index required';
    END IF;

    -- Site_id_organizationId_key is required for Asset→Site FK
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'Site' AND indexname = 'Site_id_organizationId_key'
    ) THEN
        RAISE EXCEPTION 'PREREQUISITE MISSING: Site_id_organizationId_key index required';
    END IF;

    -- Collection_id_organizationId_key is required for Asset→Collection FK
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'Collection' AND indexname = 'Collection_id_organizationId_key'
    ) THEN
        RAISE EXCEPTION 'PREREQUISITE MISSING: Collection_id_organizationId_key index required';
    END IF;

    RAISE NOTICE 'All prerequisite indexes verified';
END $$;

-- ============================================
-- STEP 1: ENUM CREATION (OUTSIDE TRANSACTION)
-- ============================================
-- Note: ALTER TYPE ADD VALUE cannot run in a transaction in PostgreSQL < 12.
-- We run enum operations first, outside the main transaction.

\echo ''
\echo 'Step 1: Creating/extending enums...'

-- AssetCategory enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssetCategory') THEN
        CREATE TYPE "AssetCategory" AS ENUM (
            'LAPTOP', 'DESKTOP', 'SERVER', 'MONITOR', 'MOBILE_PHONE',
            'TABLET', 'PRINTER', 'NETWORKING', 'STORAGE_DEVICE',
            'UPS_BATTERY', 'PERIPHERAL', 'CABLE_ACCESSORY', 'OTHER'
        );
        RAISE NOTICE 'Created AssetCategory enum';
    ELSE
        RAISE NOTICE 'AssetCategory enum already exists';
    END IF;
END $$;

-- PhysicalCondition enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PhysicalCondition') THEN
        CREATE TYPE "PhysicalCondition" AS ENUM (
            'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'FOR_PARTS'
        );
        RAISE NOTICE 'Created PhysicalCondition enum';
    ELSE
        RAISE NOTICE 'PhysicalCondition enum already exists';
    END IF;
END $$;

-- FunctionalCondition enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FunctionalCondition') THEN
        CREATE TYPE "FunctionalCondition" AS ENUM (
            'WORKING', 'PARTIAL', 'NOT_WORKING', 'UNTESTED'
        );
        RAISE NOTICE 'Created FunctionalCondition enum';
    ELSE
        RAISE NOTICE 'FunctionalCondition enum already exists';
    END IF;
END $$;

-- DataBearingStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DataBearingStatus') THEN
        CREATE TYPE "DataBearingStatus" AS ENUM (
            'NOT_APPLICABLE', 'NOT_ASSESSED', 'DATA_PRESENT',
            'WIPED_STANDARD', 'WIPED_CERTIFIED', 'PHYSICALLY_DESTROYED'
        );
        RAISE NOTICE 'Created DataBearingStatus enum';
    ELSE
        RAISE NOTICE 'DataBearingStatus enum already exists';
    END IF;
END $$;

-- DispositionOutcome enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DispositionOutcome') THEN
        CREATE TYPE "DispositionOutcome" AS ENUM (
            'PENDING', 'RESALE', 'DONATION', 'RECYCLE', 'DESTROY', 'RETURN'
        );
        RAISE NOTICE 'Created DispositionOutcome enum';
    ELSE
        RAISE NOTICE 'DispositionOutcome enum already exists';
    END IF;
END $$;

-- Extend AssetStatus enum with Phase 4 values
-- Note: These run outside transaction for PostgreSQL < 12 compatibility
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'PROCESSING' AFTER 'DATA_ERASURE';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'READY' AFTER 'PROCESSING';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'LISTED' AFTER 'READY';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'SOLD' AFTER 'LISTED';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'RECYCLED' AFTER 'SOLD';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'DESTROYED' AFTER 'RECYCLED';
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'RETURNED' AFTER 'DESTROYED';
-- RELEASED already exists from init migration, but add if missing
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'RELEASED' AFTER 'RETURNED';

\echo 'Enums created/extended successfully'

-- ============================================
-- BEGIN MAIN TRANSACTION
-- ============================================

BEGIN;

-- ============================================
-- STEP 2: CLEAN FAILED MIGRATION RECORD
-- ============================================

\echo ''
\echo 'Step 2: Cleaning failed migration record...'

-- Remove failed/incomplete migration record
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20241030000000_phase4_asset_tracking'
  AND (finished_at IS NULL OR rolled_back_at IS NOT NULL);

-- ============================================
-- STEP 3: CREATE WAREHOUSE LOCATION TABLE
-- ============================================

\echo ''
\echo 'Step 3: Creating WarehouseLocation table...'

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

-- WarehouseLocation indexes
CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseLocation_organizationId_code_key"
    ON "WarehouseLocation"("organizationId", "code");

CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseLocation_id_organizationId_key"
    ON "WarehouseLocation"("id", "organizationId");

CREATE INDEX IF NOT EXISTS "WarehouseLocation_organizationId_isActive_idx"
    ON "WarehouseLocation"("organizationId", "isActive");

-- WarehouseLocation FK to Organization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'WarehouseLocation_organizationId_fkey'
    ) THEN
        ALTER TABLE "WarehouseLocation"
            ADD CONSTRAINT "WarehouseLocation_organizationId_fkey"
            FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created WarehouseLocation_organizationId_fkey';
    END IF;
END $$;

-- ============================================
-- STEP 4: EXTEND ASSET TABLE COLUMNS
-- ============================================

\echo ''
\echo 'Step 4: Adding Asset table columns...'

-- Make collectionId nullable (was required in init)
ALTER TABLE "Asset" ALTER COLUMN "collectionId" DROP NOT NULL;

-- Add new columns (all nullable or with safe defaults)
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "qrCode" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "customerAssetTag" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "siteId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "specifications" JSONB;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "physicalCondition" "PhysicalCondition" DEFAULT 'FAIR';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "functionalCondition" "FunctionalCondition" DEFAULT 'UNTESTED';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "conditionNotes" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dataBearingStatus" "DataBearingStatus" DEFAULT 'NOT_ASSESSED';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "storageType" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "storageCapacity" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dataWipeMethod" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dataWipeDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dataWipeCertificate" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dataWipeOperator" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "photos" TEXT[] DEFAULT '{}';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "collectedAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "receivedAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "inspectedAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "warehouseLocationId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "binLocation" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "assignedOperatorId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "assignedOperatorName" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "estimatedValue" DECIMAL(10, 2);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "actualSalePrice" DECIMAL(10, 2);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "weight" DECIMAL(8, 3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dispositionOutcome" "DispositionOutcome" DEFAULT 'PENDING';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dispositionDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dispositionNotes" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "buyerName" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "buyerReference" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "recyclingPartner" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "recyclingCertificate" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "createdByName" TEXT;

-- ============================================
-- STEP 5: CATEGORY COLUMN MIGRATION (IDEMPOTENT)
-- ============================================

\echo ''
\echo 'Step 5: Migrating category column...'

DO $$
DECLARE
    category_type TEXT;
    has_category_other BOOLEAN;
    has_category_enum BOOLEAN;
BEGIN
    -- Detect current state
    SELECT udt_name INTO category_type
    FROM information_schema.columns
    WHERE table_name = 'Asset' AND column_name = 'category' AND table_schema = 'public';

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Asset' AND column_name = 'categoryOther' AND table_schema = 'public'
    ) INTO has_category_other;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Asset' AND column_name = 'categoryEnum' AND table_schema = 'public'
    ) INTO has_category_enum;

    RAISE NOTICE 'Category state: type=%, hasOther=%, hasEnum=%', category_type, has_category_other, has_category_enum;

    -- State 1: Original (category is TEXT, no categoryOther, no categoryEnum)
    IF category_type = 'text' AND NOT has_category_other AND NOT has_category_enum THEN
        RAISE NOTICE 'State 1: Full category migration needed';

        -- Add temporary enum column
        ALTER TABLE "Asset" ADD COLUMN "categoryEnum" "AssetCategory" DEFAULT 'OTHER';

        -- Migrate existing data
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
            END;

        -- Rename columns
        ALTER TABLE "Asset" RENAME COLUMN "category" TO "categoryOther";
        ALTER TABLE "Asset" RENAME COLUMN "categoryEnum" TO "category";

        RAISE NOTICE 'Category migration completed';

    -- State 2: Partial (categoryEnum exists, needs rename)
    ELSIF has_category_enum AND category_type = 'text' THEN
        RAISE NOTICE 'State 2: Completing partial category migration (rename needed)';

        -- Just complete the rename
        IF NOT has_category_other THEN
            ALTER TABLE "Asset" RENAME COLUMN "category" TO "categoryOther";
        END IF;
        ALTER TABLE "Asset" RENAME COLUMN "categoryEnum" TO "category";

        RAISE NOTICE 'Category rename completed';

    -- State 3: Complete (category is enum type)
    ELSIF category_type = 'assetcategory' THEN
        RAISE NOTICE 'State 3: Category already migrated to enum';

        -- Ensure categoryOther exists (might be missing if created fresh)
        IF NOT has_category_other THEN
            ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "categoryOther" TEXT;
            RAISE NOTICE 'Added missing categoryOther column';
        END IF;

    ELSE
        RAISE NOTICE 'Category state: unrecognized, may need manual intervention';
    END IF;
END $$;

-- ============================================
-- STEP 6: CREATE ASSET INDEXES
-- ============================================

\echo ''
\echo 'Step 6: Creating Asset indexes...'

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
-- STEP 7: CREATE ASSET COMPOSITE UNIQUE INDEX
-- ============================================
-- CRITICAL: This must exist BEFORE any FK that references Asset(id, organizationId)

\echo ''
\echo 'Step 7: Creating Asset_id_organizationId_key (CRITICAL)...'

-- Verify no duplicates before creating unique index
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count FROM (
        SELECT id, "organizationId"
        FROM "Asset"
        GROUP BY id, "organizationId"
        HAVING COUNT(*) > 1
    ) dupes;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Cannot create unique index: % duplicate Asset(id, organizationId) combinations found. Fix data first.', duplicate_count;
    END IF;

    RAISE NOTICE 'No duplicate Asset(id, organizationId) combinations found';
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Asset_id_organizationId_key"
    ON "Asset"("id", "organizationId");

-- ============================================
-- STEP 8: CREATE ASSET FOREIGN KEYS
-- ============================================
-- IMPORTANT: Using ON DELETE RESTRICT (not SET NULL) because organizationId is NOT NULL
-- ON DELETE SET NULL would try to null both columns, violating the NOT NULL constraint

\echo ''
\echo 'Step 8: Creating Asset foreign keys (with RESTRICT)...'

-- Asset → Customer FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Asset_customerId_organizationId_fkey'
    ) THEN
        ALTER TABLE "Asset"
            ADD CONSTRAINT "Asset_customerId_organizationId_fkey"
            FOREIGN KEY ("customerId", "organizationId")
            REFERENCES "Customer"("id", "organizationId")
            ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE 'Created Asset_customerId_organizationId_fkey with ON DELETE RESTRICT';
    ELSE
        RAISE NOTICE 'Asset_customerId_organizationId_fkey already exists';
    END IF;
END $$;

-- Asset → Site FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Asset_siteId_organizationId_fkey'
    ) THEN
        ALTER TABLE "Asset"
            ADD CONSTRAINT "Asset_siteId_organizationId_fkey"
            FOREIGN KEY ("siteId", "organizationId")
            REFERENCES "Site"("id", "organizationId")
            ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE 'Created Asset_siteId_organizationId_fkey with ON DELETE RESTRICT';
    ELSE
        RAISE NOTICE 'Asset_siteId_organizationId_fkey already exists';
    END IF;
END $$;

-- Asset → WarehouseLocation FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Asset_warehouseLocationId_organizationId_fkey'
    ) THEN
        ALTER TABLE "Asset"
            ADD CONSTRAINT "Asset_warehouseLocationId_organizationId_fkey"
            FOREIGN KEY ("warehouseLocationId", "organizationId")
            REFERENCES "WarehouseLocation"("id", "organizationId")
            ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE 'Created Asset_warehouseLocationId_organizationId_fkey with ON DELETE RESTRICT';
    ELSE
        RAISE NOTICE 'Asset_warehouseLocationId_organizationId_fkey already exists';
    END IF;
END $$;

-- ============================================
-- STEP 9: CREATE ASSET NOTE TABLE
-- ============================================

\echo ''
\echo 'Step 9: Creating AssetNote table...'

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

-- AssetNote → Organization FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AssetNote_organizationId_fkey'
    ) THEN
        ALTER TABLE "AssetNote"
            ADD CONSTRAINT "AssetNote_organizationId_fkey"
            FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created AssetNote_organizationId_fkey';
    END IF;
END $$;

-- Verify Asset_id_organizationId_key exists before creating FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'Asset' AND indexname = 'Asset_id_organizationId_key'
    ) THEN
        RAISE EXCEPTION 'CRITICAL: Asset_id_organizationId_key must exist before creating AssetNote FK';
    END IF;
END $$;

-- AssetNote → Asset FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AssetNote_assetId_organizationId_fkey'
    ) THEN
        ALTER TABLE "AssetNote"
            ADD CONSTRAINT "AssetNote_assetId_organizationId_fkey"
            FOREIGN KEY ("assetId", "organizationId")
            REFERENCES "Asset"("id", "organizationId")
            ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created AssetNote_assetId_organizationId_fkey';
    END IF;
END $$;

-- ============================================
-- STEP 10: CREATE ASSET STATUS CHANGE TABLE
-- ============================================

\echo ''
\echo 'Step 10: Creating AssetStatusChange table...'

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

-- AssetStatusChange → Organization FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AssetStatusChange_organizationId_fkey'
    ) THEN
        ALTER TABLE "AssetStatusChange"
            ADD CONSTRAINT "AssetStatusChange_organizationId_fkey"
            FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created AssetStatusChange_organizationId_fkey';
    END IF;
END $$;

-- AssetStatusChange → Asset FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AssetStatusChange_assetId_organizationId_fkey'
    ) THEN
        ALTER TABLE "AssetStatusChange"
            ADD CONSTRAINT "AssetStatusChange_assetId_organizationId_fkey"
            FOREIGN KEY ("assetId", "organizationId")
            REFERENCES "Asset"("id", "organizationId")
            ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Created AssetStatusChange_assetId_organizationId_fkey';
    END IF;
END $$;

-- ============================================
-- STEP 11: RECORD MIGRATION AS APPLIED
-- ============================================

\echo ''
\echo 'Step 11: Recording migration in Prisma history...'

INSERT INTO "_prisma_migrations" (
    id,
    checksum,
    migration_name,
    logs,
    rolled_back_at,
    started_at,
    applied_steps_count,
    finished_at
) VALUES (
    gen_random_uuid()::text,
    'phase4_recovery_v2_applied',
    '20241030000000_phase4_asset_tracking',
    'Applied via phase4-recovery-migration-v2.sql',
    NULL,
    NOW(),
    1,
    NOW()
)
ON CONFLICT (migration_name) DO UPDATE
SET finished_at = NOW(),
    rolled_back_at = NULL,
    logs = 'Re-applied via phase4-recovery-migration-v2.sql',
    checksum = 'phase4_recovery_v2_applied';

-- ============================================
-- STEP 12: FINAL VERIFICATION
-- ============================================

\echo ''
\echo 'Step 12: Final verification...'

DO $$
DECLARE
    missing_objects TEXT := '';
    fk_action TEXT;
BEGIN
    -- Check enums
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AssetCategory') THEN
        missing_objects := missing_objects || 'AssetCategory enum, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PhysicalCondition') THEN
        missing_objects := missing_objects || 'PhysicalCondition enum, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FunctionalCondition') THEN
        missing_objects := missing_objects || 'FunctionalCondition enum, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DataBearingStatus') THEN
        missing_objects := missing_objects || 'DataBearingStatus enum, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DispositionOutcome') THEN
        missing_objects := missing_objects || 'DispositionOutcome enum, ';
    END IF;

    -- Check tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'WarehouseLocation') THEN
        missing_objects := missing_objects || 'WarehouseLocation table, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AssetNote') THEN
        missing_objects := missing_objects || 'AssetNote table, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AssetStatusChange') THEN
        missing_objects := missing_objects || 'AssetStatusChange table, ';
    END IF;

    -- Check critical unique indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Asset_id_organizationId_key') THEN
        missing_objects := missing_objects || 'Asset_id_organizationId_key index, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'WarehouseLocation_id_organizationId_key') THEN
        missing_objects := missing_objects || 'WarehouseLocation_id_organizationId_key index, ';
    END IF;

    -- Check critical FKs
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetNote_assetId_organizationId_fkey') THEN
        missing_objects := missing_objects || 'AssetNote_assetId_organizationId_fkey FK, ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetStatusChange_assetId_organizationId_fkey') THEN
        missing_objects := missing_objects || 'AssetStatusChange_assetId_organizationId_fkey FK, ';
    END IF;

    -- Verify FK referential actions are RESTRICT (not SET NULL)
    SELECT confdeltype INTO fk_action
    FROM pg_constraint
    WHERE conname = 'Asset_customerId_organizationId_fkey';

    IF fk_action IS NOT NULL AND fk_action != 'r' THEN
        RAISE WARNING 'Asset_customerId_organizationId_fkey has wrong delete action: % (should be r=RESTRICT)', fk_action;
    END IF;

    IF missing_objects != '' THEN
        RAISE EXCEPTION 'Migration verification FAILED. Missing: %', missing_objects;
    END IF;

    RAISE NOTICE 'All Phase 4 objects verified successfully';
END $$;

-- Check Asset.category column type
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT udt_name INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'Asset' AND column_name = 'category' AND table_schema = 'public';

    IF col_type != 'assetcategory' THEN
        RAISE WARNING 'Asset.category column type is % (expected assetcategory)', col_type;
    ELSE
        RAISE NOTICE 'Asset.category is correctly typed as AssetCategory enum';
    END IF;
END $$;

\echo ''
\echo '========================================'
\echo 'PHASE 4 RECOVERY MIGRATION v2 - COMPLETE'
\echo '========================================'
\echo ''
\echo 'IMPORTANT: Run phase4-post-migration-verification.sql to confirm all objects.'
\echo 'Then run: npx prisma generate && npm run build'
\echo ''

COMMIT;
