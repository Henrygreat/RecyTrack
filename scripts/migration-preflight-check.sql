-- ============================================
-- MIGRATION PREFLIGHT CHECK
-- ============================================
--
-- Run this script BEFORE any new migration to detect potential issues.
-- This implements the rules from DATABASE_MIGRATION_RULES.md
--
-- Usage:
--   psql -f scripts/migration-preflight-check.sql
--
-- All checks must PASS before proceeding with migration.
-- ============================================

\echo '========================================'
\echo 'MIGRATION PREFLIGHT CHECK'
\echo '========================================'

-- ============================================
-- 1. CHECK COMPOSITE FK PREREQUISITES
-- ============================================

\echo ''
\echo '1. Checking composite FK prerequisites...'
\echo '   These tables MUST have @@unique([id, organizationId]) for multi-tenant FKs:'

SELECT
    table_name AS "Table",
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = table_name
            AND indexname = table_name || '_id_organizationId_key'
        ) THEN 'PASS'
        ELSE 'MISSING'
    END AS "Composite Unique Index"
FROM (
    VALUES
        ('Customer'),
        ('Site'),
        ('Collection'),
        ('CollectionZone'),
        ('RouteDate'),
        ('Asset'),
        ('WarehouseLocation'),
        ('CustomerContact')
) AS required_tables(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_name = required_tables.table_name
);

-- ============================================
-- 2. CHECK FOR DUPLICATE COMPOSITE KEYS
-- ============================================

\echo ''
\echo '2. Checking for duplicate (id, organizationId) combinations...'

DO $$
DECLARE
    table_rec RECORD;
    dup_count INTEGER;
    has_duplicates BOOLEAN := FALSE;
BEGIN
    FOR table_rec IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'organizationId'
        AND table_schema = 'public'
        AND table_name NOT LIKE '_%'
    LOOP
        EXECUTE format(
            'SELECT COUNT(*) FROM (
                SELECT id, "organizationId"
                FROM %I
                GROUP BY id, "organizationId"
                HAVING COUNT(*) > 1
            ) dupes',
            table_rec.table_name
        ) INTO dup_count;

        IF dup_count > 0 THEN
            RAISE WARNING 'FAIL: % has % duplicate (id, organizationId) combinations', table_rec.table_name, dup_count;
            has_duplicates := TRUE;
        END IF;
    END LOOP;

    IF NOT has_duplicates THEN
        RAISE NOTICE 'PASS: No duplicate composite keys found';
    END IF;
END $$;

-- ============================================
-- 3. CHECK PRISMA MIGRATION STATE
-- ============================================

\echo ''
\echo '3. Checking Prisma migration state...'

SELECT
    migration_name,
    CASE
        WHEN finished_at IS NOT NULL AND rolled_back_at IS NULL THEN 'APPLIED'
        WHEN rolled_back_at IS NOT NULL THEN 'ROLLED BACK'
        WHEN finished_at IS NULL THEN 'FAILED/INCOMPLETE'
        ELSE 'UNKNOWN'
    END AS status,
    started_at,
    finished_at
FROM "_prisma_migrations"
ORDER BY started_at DESC
LIMIT 10;

-- Check for failed migrations
DO $$
DECLARE
    failed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO failed_count
    FROM "_prisma_migrations"
    WHERE finished_at IS NULL AND rolled_back_at IS NULL;

    IF failed_count > 0 THEN
        RAISE WARNING 'FAIL: % failed/incomplete migrations detected', failed_count;
    ELSE
        RAISE NOTICE 'PASS: No failed migrations';
    END IF;
END $$;

-- ============================================
-- 4. CHECK FK REFERENTIAL ACTIONS
-- ============================================

\echo ''
\echo '4. Checking FK referential actions on composite FKs...'
\echo '   Composite FKs with required organizationId should use RESTRICT or CASCADE, not SET NULL.'

SELECT
    conname AS "Constraint",
    conrelid::regclass AS "Table",
    CASE confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT (OK)'
        WHEN 'c' THEN 'CASCADE (OK)'
        WHEN 'n' THEN 'SET NULL (REVIEW!)'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS "On Delete",
    CASE confdeltype WHEN 'n' THEN 'WARNING' ELSE 'OK' END AS "Status"
FROM pg_constraint
WHERE contype = 'f'
    AND array_length(confkey, 1) > 1  -- Composite FK
    AND conname LIKE '%organizationId%'
ORDER BY conrelid::regclass::text, conname;

-- ============================================
-- 5. CHECK SCHEMA DRIFT
-- ============================================

\echo ''
\echo '5. Checking for potential schema drift...'

-- Check if _prisma_migrations table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = '_prisma_migrations'
    ) THEN
        RAISE WARNING 'FAIL: _prisma_migrations table not found - Prisma not initialized';
    ELSE
        RAISE NOTICE 'PASS: _prisma_migrations table exists';
    END IF;
END $$;

-- Check PostgreSQL version
DO $$
DECLARE
    pg_version INTEGER;
BEGIN
    SELECT current_setting('server_version_num')::integer INTO pg_version;
    IF pg_version < 120000 THEN
        RAISE NOTICE 'INFO: PostgreSQL version < 12. ALTER TYPE ADD VALUE cannot run in transactions.';
    ELSE
        RAISE NOTICE 'PASS: PostgreSQL version >= 12. ALTER TYPE ADD VALUE can run in transactions.';
    END IF;
END $$;

-- ============================================
-- 6. CHECK ENUM STATES
-- ============================================

\echo ''
\echo '6. Listing current enum types and values...'

SELECT
    t.typname AS "Enum Type",
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS "Values"
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN (
    'Role', 'CustomerRole', 'CustomerType', 'CustomerStatus',
    'CollectionStatus', 'CollectionPriority', 'CollectionType', 'BookingMode',
    'AssetStatus', 'AssetCategory', 'PhysicalCondition', 'FunctionalCondition',
    'DataBearingStatus', 'DispositionOutcome'
)
GROUP BY t.typname
ORDER BY t.typname;

-- ============================================
-- 7. CHECK TABLE ROW COUNTS
-- ============================================

\echo ''
\echo '7. Current table row counts (for reference)...'

SELECT
    relname AS "Table",
    n_live_tup AS "Rows"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- ============================================
-- SUMMARY
-- ============================================

\echo ''
\echo '========================================'
\echo 'PREFLIGHT CHECK COMPLETE'
\echo '========================================'
\echo ''
\echo 'Review all output above before proceeding with migration.'
\echo ''
\echo 'If any checks show FAIL or WARNING:'
\echo '  1. Fix the underlying issue first'
\echo '  2. Re-run this preflight check'
\echo '  3. Only proceed when all checks pass'
\echo ''
