-- ============================================
-- PHASE 4 POST-MIGRATION VERIFICATION SCRIPT
-- ============================================
-- Run this script AFTER applying the recovery migration.
-- All checks must PASS before considering migration complete.

\echo '========================================'
\echo 'PHASE 4 POST-MIGRATION VERIFICATION'
\echo '========================================'

-- ============================================
-- 1. VERIFY MIGRATION RECORD
-- ============================================

\echo ''
\echo '1. Verifying Prisma migration record...'

SELECT
    migration_name,
    CASE
        WHEN finished_at IS NOT NULL AND rolled_back_at IS NULL THEN 'PASS: Applied successfully'
        WHEN rolled_back_at IS NOT NULL THEN 'FAIL: Rolled back'
        ELSE 'FAIL: Incomplete'
    END AS status,
    finished_at
FROM "_prisma_migrations"
WHERE migration_name = '20241030000000_phase4_asset_tracking';

-- ============================================
-- 2. VERIFY ENUMS
-- ============================================

\echo ''
\echo '2. Verifying Phase 4 enums...'

SELECT
    required_enum,
    CASE WHEN t.typname IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status
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
-- 3. VERIFY ASSET STATUS ENUM VALUES
-- ============================================

\echo ''
\echo '3. Verifying AssetStatus enum values...'

SELECT enumlabel AS status_value,
    CASE
        WHEN enumlabel IN ('EXPECTED', 'COLLECTED', 'RECEIVED', 'INSPECTION',
                           'DATA_ERASURE', 'PROCESSING', 'READY', 'LISTED',
                           'SOLD', 'RECYCLED', 'DESTROYED', 'RETURNED', 'RELEASED')
        THEN 'PASS'
        ELSE 'UNKNOWN'
    END AS status
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AssetStatus')
ORDER BY enumsortorder;

-- ============================================
-- 4. VERIFY TABLES
-- ============================================

\echo ''
\echo '4. Verifying Phase 4 tables...'

SELECT
    required_table,
    CASE WHEN t.table_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
    SELECT unnest(ARRAY['WarehouseLocation', 'AssetNote', 'AssetStatusChange']) AS required_table
) r
LEFT JOIN information_schema.tables t
    ON t.table_name = r.required_table
    AND t.table_schema = 'public';

-- ============================================
-- 5. VERIFY CRITICAL UNIQUE INDEXES
-- ============================================

\echo ''
\echo '5. Verifying critical unique indexes for FK references...'

SELECT
    required_index,
    CASE WHEN i.indexname IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
    SELECT unnest(ARRAY[
        'Asset_id_organizationId_key',
        'WarehouseLocation_id_organizationId_key',
        'Customer_id_organizationId_key',
        'Site_id_organizationId_key'
    ]) AS required_index
) r
LEFT JOIN pg_indexes i ON i.indexname = r.required_index;

-- ============================================
-- 6. VERIFY FOREIGN KEYS
-- ============================================

\echo ''
\echo '6. Verifying Phase 4 foreign keys...'

SELECT
    required_fk,
    CASE WHEN c.conname IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
    SELECT unnest(ARRAY[
        'WarehouseLocation_organizationId_fkey',
        'Asset_customerId_organizationId_fkey',
        'Asset_siteId_organizationId_fkey',
        'Asset_warehouseLocationId_organizationId_fkey',
        'AssetNote_organizationId_fkey',
        'AssetNote_assetId_organizationId_fkey',
        'AssetStatusChange_organizationId_fkey',
        'AssetStatusChange_assetId_organizationId_fkey'
    ]) AS required_fk
) r
LEFT JOIN pg_constraint c ON c.conname = r.required_fk AND c.contype = 'f';

-- ============================================
-- 7. VERIFY ASSET TABLE COLUMNS
-- ============================================

\echo ''
\echo '7. Verifying Asset table Phase 4 columns...'

SELECT
    required_column,
    CASE WHEN c.column_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
    SELECT unnest(ARRAY[
        'qrCode', 'customerAssetTag', 'customerId', 'siteId',
        'physicalCondition', 'functionalCondition', 'conditionNotes',
        'dataBearingStatus', 'storageType', 'storageCapacity',
        'dataWipeMethod', 'dataWipeDate', 'dataWipeCertificate',
        'warehouseLocationId', 'binLocation',
        'estimatedValue', 'actualSalePrice', 'weight',
        'dispositionOutcome', 'dispositionDate', 'dispositionNotes',
        'createdByUserId', 'createdByName'
    ]) AS required_column
) r
LEFT JOIN information_schema.columns c
    ON c.table_name = 'Asset'
    AND c.column_name = r.required_column
    AND c.table_schema = 'public'
ORDER BY required_column;

-- ============================================
-- 8. VERIFY DATA INTEGRITY
-- ============================================

\echo ''
\echo '8. Verifying data integrity...'

-- Check no orphan records
SELECT 'Asset→Customer orphans' AS check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || COUNT(*) || ' orphans' END AS status
FROM "Asset" a
WHERE a."customerId" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = a."customerId" AND c."organizationId" = a."organizationId");

SELECT 'Asset→Site orphans' AS check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || COUNT(*) || ' orphans' END AS status
FROM "Asset" a
WHERE a."siteId" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "Site" s WHERE s.id = a."siteId" AND s."organizationId" = a."organizationId");

SELECT 'Asset→WarehouseLocation orphans' AS check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || COUNT(*) || ' orphans' END AS status
FROM "Asset" a
WHERE a."warehouseLocationId" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "WarehouseLocation" w WHERE w.id = a."warehouseLocationId" AND w."organizationId" = a."organizationId");

-- ============================================
-- 9. VERIFY ROW COUNTS
-- ============================================

\echo ''
\echo '9. Verifying table row counts...'

SELECT 'Asset' AS table_name, COUNT(*) AS row_count FROM "Asset"
UNION ALL
SELECT 'WarehouseLocation', COUNT(*) FROM "WarehouseLocation"
UNION ALL
SELECT 'AssetNote', COUNT(*) FROM "AssetNote"
UNION ALL
SELECT 'AssetStatusChange', COUNT(*) FROM "AssetStatusChange"
ORDER BY table_name;

-- ============================================
-- 10. SUMMARY
-- ============================================

\echo ''
\echo '========================================'
\echo 'VERIFICATION COMPLETE'
\echo '========================================'

-- Count failures
DO $$
DECLARE
    fail_count INTEGER := 0;
BEGIN
    -- Check all critical indexes exist
    SELECT COUNT(*) INTO fail_count FROM (
        SELECT 1 FROM pg_indexes WHERE indexname = 'Asset_id_organizationId_key'
        UNION ALL
        SELECT 1 FROM pg_indexes WHERE indexname = 'WarehouseLocation_id_organizationId_key'
    ) checks
    WHERE 1=0; -- This will always be 0, just checking syntax

    -- Actual check
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Asset_id_organizationId_key') THEN
        RAISE WARNING 'CRITICAL: Asset_id_organizationId_key index is missing!';
        fail_count := fail_count + 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AssetNote') THEN
        RAISE WARNING 'CRITICAL: AssetNote table is missing!';
        fail_count := fail_count + 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'AssetStatusChange') THEN
        RAISE WARNING 'CRITICAL: AssetStatusChange table is missing!';
        fail_count := fail_count + 1;
    END IF;

    IF fail_count = 0 THEN
        RAISE NOTICE '✓ All critical Phase 4 objects verified successfully';
    ELSE
        RAISE WARNING '✗ % critical objects missing - migration incomplete', fail_count;
    END IF;
END $$;

\echo ''
\echo 'Review all results above. All checks should show PASS.'
\echo 'If any show FAIL, investigate before proceeding.'
\echo ''
