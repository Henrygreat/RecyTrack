-- ============================================
-- PHASE 4 PRE-MIGRATION VALIDATION SCRIPT
-- ============================================
-- Run this script BEFORE applying the recovery migration.
-- All checks must pass before proceeding.
-- DO NOT proceed if any validation fails.

\echo '========================================'
\echo 'PHASE 4 PRE-MIGRATION VALIDATION'
\echo '========================================'

-- ============================================
-- 1. CHECK PRISMA MIGRATION STATE
-- ============================================

\echo ''
\echo '1. Checking Prisma migration history...'

SELECT
    migration_name,
    CASE
        WHEN rolled_back_at IS NOT NULL THEN 'ROLLED_BACK'
        WHEN finished_at IS NOT NULL THEN 'APPLIED'
        ELSE 'FAILED'
    END AS status,
    started_at,
    finished_at,
    rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name LIKE '%phase4%' OR migration_name = '20241030000000_phase4_asset_tracking'
ORDER BY started_at DESC;

-- ============================================
-- 2. CHECK REQUIRED PREREQUISITE TABLES
-- ============================================

\echo ''
\echo '2. Checking prerequisite tables exist...'

SELECT
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status
FROM (
    SELECT unnest(ARRAY['Organization', 'Customer', 'Site', 'Asset']) AS required_table
) r
LEFT JOIN information_schema.tables t
    ON t.table_name = r.required_table
    AND t.table_schema = 'public'
ORDER BY required_table;

-- ============================================
-- 3. CHECK REQUIRED UNIQUE CONSTRAINTS
-- ============================================

\echo ''
\echo '3. Checking required unique constraints for FK references...'

-- Organization(id) - Primary key
SELECT 'Organization(id)' AS constraint_target,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'Organization' AND indexname = 'Organization_pkey'
    ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- Customer(id, organizationId)
SELECT 'Customer(id, organizationId)' AS constraint_target,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'Customer' AND indexname = 'Customer_id_organizationId_key'
    ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- Site(id, organizationId)
SELECT 'Site(id, organizationId)' AS constraint_target,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'Site' AND indexname = 'Site_id_organizationId_key'
    ) THEN 'EXISTS' ELSE 'MISSING' END AS status;

-- Asset(id, organizationId) - THIS IS THE ONE WE NEED TO CREATE
SELECT 'Asset(id, organizationId)' AS constraint_target,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'Asset' AND indexname = 'Asset_id_organizationId_key'
    ) THEN 'EXISTS' ELSE 'MISSING - WILL BE CREATED' END AS status;

-- ============================================
-- 4. CHECK FOR DUPLICATE ASSET RECORDS
-- ============================================

\echo ''
\echo '4. Checking for duplicate Asset(id, organizationId) combinations...'
\echo '   (Must be zero for unique constraint creation)'

SELECT
    id,
    "organizationId",
    COUNT(*) AS duplicate_count
FROM "Asset"
GROUP BY id, "organizationId"
HAVING COUNT(*) > 1;

SELECT
    CASE WHEN COUNT(*) = 0
        THEN 'PASS: No duplicates found - safe to create unique constraint'
        ELSE 'FAIL: Duplicates exist - cannot create unique constraint'
    END AS duplicate_check
FROM (
    SELECT id, "organizationId"
    FROM "Asset"
    GROUP BY id, "organizationId"
    HAVING COUNT(*) > 1
) duplicates;

-- ============================================
-- 5. CHECK PHASE 4 TABLES STATE
-- ============================================

\echo ''
\echo '5. Checking Phase 4 tables state...'

SELECT
    required_table,
    CASE WHEN t.table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status
FROM (
    SELECT unnest(ARRAY['WarehouseLocation', 'AssetNote', 'AssetStatusChange']) AS required_table
) r
LEFT JOIN information_schema.tables t
    ON t.table_name = r.required_table
    AND t.table_schema = 'public';

-- ============================================
-- 6. CHECK PHASE 4 ENUMS STATE
-- ============================================

\echo ''
\echo '6. Checking Phase 4 enums state...'

SELECT
    required_enum,
    CASE WHEN t.typname IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status
FROM (
    SELECT unnest(ARRAY[
        'AssetCategory',
        'PhysicalCondition',
        'FunctionalCondition',
        'DataBearingStatus',
        'DispositionOutcome'
    ]) AS required_enum
) r
LEFT JOIN pg_type t ON t.typname = r.required_enum;

-- ============================================
-- 7. CHECK ASSET TABLE COLUMNS
-- ============================================

\echo ''
\echo '7. Checking Asset table columns (Phase 4 additions)...'

SELECT
    required_column,
    CASE WHEN c.column_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS status
FROM (
    SELECT unnest(ARRAY[
        'qrCode', 'customerAssetTag', 'customerId', 'siteId',
        'physicalCondition', 'functionalCondition', 'conditionNotes',
        'dataBearingStatus', 'storageType', 'storageCapacity',
        'dataWipeMethod', 'dataWipeDate', 'dataWipeCertificate',
        'warehouseLocationId', 'binLocation',
        'estimatedValue', 'actualSalePrice', 'weight',
        'dispositionOutcome', 'dispositionDate', 'dispositionNotes'
    ]) AS required_column
) r
LEFT JOIN information_schema.columns c
    ON c.table_name = 'Asset'
    AND c.column_name = r.required_column
    AND c.table_schema = 'public'
ORDER BY required_column;

-- ============================================
-- 8. CHECK EXISTING FOREIGN KEYS
-- ============================================

\echo ''
\echo '8. Checking existing foreign keys on Phase 4 tables...'

SELECT
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    confrelid::regclass AS references_table
FROM pg_constraint
WHERE contype = 'f'
    AND (
        conrelid::regclass::text IN ('AssetNote', 'AssetStatusChange', 'WarehouseLocation')
        OR (conrelid::regclass::text = 'Asset' AND conname LIKE '%customerId%' OR conname LIKE '%siteId%' OR conname LIKE '%warehouseLocationId%')
    )
ORDER BY conrelid::regclass::text, conname;

-- ============================================
-- 9. CHECK ASSET TABLE INDEXES
-- ============================================

\echo ''
\echo '9. Current Asset table indexes...'

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Asset'
ORDER BY indexname;

-- ============================================
-- 10. SUMMARY
-- ============================================

\echo ''
\echo '========================================'
\echo 'VALIDATION COMPLETE'
\echo '========================================'
\echo ''
\echo 'Review all results above before proceeding.'
\echo 'All checks must show PASS/EXISTS for required items.'
\echo ''
\echo 'If Asset_id_organizationId_key is MISSING and duplicate_check is PASS,'
\echo 'you may proceed with the recovery migration.'
\echo ''
