# Phase 4 Migration Recovery Plan

## Error Summary

**Migration**: `20241030000000_phase4_asset_tracking`
**PostgreSQL Error**: `E42830` - "There is no unique constraint matching given keys for referenced table Asset"

## Root Cause

The migration creates foreign keys referencing `Asset("id", "organizationId")` but never creates the required unique index on that column combination.

### Production Asset Indexes (Before Migration)
```
Asset_pkey: UNIQUE(id)
Asset_organizationId_serialNumber_idx: non-unique(organizationId, serialNumber)
Asset_organizationId_assetTag_key: UNIQUE(organizationId, assetTag)
```

### Missing Index
```sql
Asset_id_organizationId_key: UNIQUE(id, organizationId)  -- DOES NOT EXIST
```

### Failing SQL Statements
```sql
-- Line 285-289 (first failure point)
ALTER TABLE "AssetNote"
    ADD CONSTRAINT "AssetNote_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId")
    REFERENCES "Asset"("id", "organizationId")  -- Requires unique index!
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Line 321-325 (would also fail)
ALTER TABLE "AssetStatusChange"
    ADD CONSTRAINT "AssetStatusChange_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId")
    REFERENCES "Asset"("id", "organizationId")  -- Requires unique index!
    ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## Step 1: Diagnose Production State

Run these queries on production to determine what was created before failure:

```sql
-- Check migration status
SELECT * FROM "_prisma_migrations"
WHERE migration_name = '20241030000000_phase4_asset_tracking';

-- Check if enums were created (should be rolled back if transaction failed)
SELECT typname FROM pg_type WHERE typname IN (
    'AssetCategory', 'PhysicalCondition', 'FunctionalCondition',
    'DataBearingStatus', 'DispositionOutcome'
);

-- Check AssetStatus enum values
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AssetStatus')
ORDER BY enumsortorder;

-- Check if WarehouseLocation table exists
SELECT tablename FROM pg_tables WHERE tablename = 'WarehouseLocation';

-- Check if AssetNote table exists
SELECT tablename FROM pg_tables WHERE tablename = 'AssetNote';

-- Check if AssetStatusChange table exists
SELECT tablename FROM pg_tables WHERE tablename = 'AssetStatusChange';

-- Check Asset table indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Asset'
ORDER BY indexname;

-- Check Asset table columns (to see if new columns were added)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Asset'
ORDER BY ordinal_position;

-- Check existing foreign keys on AssetNote
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conrelid = 'AssetNote'::regclass AND contype = 'f';

-- Check existing foreign keys on AssetStatusChange
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conrelid = 'AssetStatusChange'::regclass AND contype = 'f';
```

---

## Step 2: Expected Diagnostic Results

### If Transaction Rolled Back (Most Likely)
- `_prisma_migrations` shows failed/rolled_back status
- New enums DO NOT exist
- WarehouseLocation table DOES NOT exist
- AssetNote table DOES NOT exist
- AssetStatusChange table DOES NOT exist
- Asset table has NO new columns

**Recovery**: Delete the failed migration record and apply corrected migration.

### If Partial Execution (DDL Auto-Commit)
Some PostgreSQL configurations auto-commit DDL statements. If this happened:
- New enums MAY exist
- Tables MAY be partially created
- Asset columns MAY be added

**Recovery**: Manual cleanup required before applying corrected migration.

---

## Step 3: Corrected Migration SQL

The fix adds the missing unique index BEFORE any foreign keys that reference it.

**Location**: Insert after line 228 (Asset indexes) and before line 234 (Asset foreign keys)

```sql
-- ============================================
-- ASSET COMPOSITE UNIQUE INDEX (REQUIRED FOR FKs)
-- ============================================

-- This index is required for multi-tenant foreign key references
-- Must exist BEFORE any FK references Asset(id, organizationId)
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_id_organizationId_key"
    ON "Asset"("id", "organizationId");
```

---

## Step 4: Recovery Procedure

### Option A: Clean Rollback (If Transaction Was Atomic)

If diagnostics confirm the migration fully rolled back:

```sql
-- 1. Remove the failed migration record
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20241030000000_phase4_asset_tracking';
```

Then apply the corrected migration.

### Option B: Partial Cleanup (If DDL Auto-Committed)

If diagnostics show partial execution, run cleanup first:

```sql
-- Drop any partially created constraints (if they exist)
ALTER TABLE "AssetNote" DROP CONSTRAINT IF EXISTS "AssetNote_assetId_organizationId_fkey";
ALTER TABLE "AssetNote" DROP CONSTRAINT IF EXISTS "AssetNote_organizationId_fkey";
ALTER TABLE "AssetStatusChange" DROP CONSTRAINT IF EXISTS "AssetStatusChange_assetId_organizationId_fkey";
ALTER TABLE "AssetStatusChange" DROP CONSTRAINT IF EXISTS "AssetStatusChange_organizationId_fkey";

-- Drop partially created tables (if empty)
DROP TABLE IF EXISTS "AssetStatusChange";
DROP TABLE IF EXISTS "AssetNote";
DROP TABLE IF EXISTS "WarehouseLocation";

-- Drop new indexes on Asset (if created)
DROP INDEX IF EXISTS "Asset_organizationId_status_idx";
DROP INDEX IF EXISTS "Asset_organizationId_category_idx";
DROP INDEX IF EXISTS "Asset_collectionId_idx";
DROP INDEX IF EXISTS "Asset_customerId_idx";
DROP INDEX IF EXISTS "Asset_warehouseLocationId_idx";
DROP INDEX IF EXISTS "Asset_organizationId_createdAt_idx";

-- Reverse column renames if they happened
-- Check if 'category' column has enum type before attempting
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Asset' AND column_name = 'category'
        AND udt_name = 'AssetCategory'
    ) THEN
        ALTER TABLE "Asset" RENAME COLUMN "category" TO "categoryEnum";
        ALTER TABLE "Asset" RENAME COLUMN "categoryOther" TO "category";
    END IF;
END $$;

-- Remove added columns (if they exist and are empty)
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "qrCode";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "customerAssetTag";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "customerId";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "siteId";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "categoryEnum";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "specifications";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "physicalCondition";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "functionalCondition";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "conditionNotes";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "dataBearingStatus";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "storageType";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "storageCapacity";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "dataWipeMethod";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "dataWipeDate";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "dataWipeCertificate";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "dataWipeOperator";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "photos";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "collectedAt";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "receivedAt";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "inspectedAt";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "processedAt";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "releasedAt";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "warehouseLocationId";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "binLocation";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "assignedOperatorId";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "assignedOperatorName";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "estimatedValue";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "actualSalePrice";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "weight";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "dispositionOutcome";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "dispositionDate";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "dispositionNotes";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "buyerName";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "buyerReference";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "recyclingPartner";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "recyclingCertificate";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "internalNotes";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "updatedAt";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "createdByUserId";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "createdByName";

-- Drop new enums (if not in use)
DROP TYPE IF EXISTS "DispositionOutcome";
DROP TYPE IF EXISTS "DataBearingStatus";
DROP TYPE IF EXISTS "FunctionalCondition";
DROP TYPE IF EXISTS "PhysicalCondition";
DROP TYPE IF EXISTS "AssetCategory";

-- Remove failed migration record
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20241030000000_phase4_asset_tracking';
```

Then apply the corrected migration.

---

## Step 5: Testing Procedure

Test the corrected migration against a copy of production:

```bash
# 1. Create test database from production backup
pg_dump -h prod-host -U user -d recytrack > prod_backup.sql
psql -h test-host -U user -d recytrack_test < prod_backup.sql

# 2. Apply corrected migration to test database
psql -h test-host -U user -d recytrack_test -f corrected_migration.sql

# 3. Verify all objects created
psql -h test-host -U user -d recytrack_test -c "
SELECT indexname FROM pg_indexes WHERE tablename = 'Asset';
SELECT tablename FROM pg_tables WHERE tablename IN ('WarehouseLocation', 'AssetNote', 'AssetStatusChange');
SELECT conname FROM pg_constraint WHERE conrelid IN ('AssetNote'::regclass, 'AssetStatusChange'::regclass);
"

# 4. Test application against test database
DATABASE_URL="postgresql://user:pass@test-host/recytrack_test" npm run build
```

---

## Files Modified

1. `prisma/migrations/20241030000000_phase4_asset_tracking/migration.sql` - Add missing unique index
2. `docs/phase4-migration-recovery.md` - This recovery document

---

## Approval Checklist

- [ ] Diagnostic queries run on production
- [ ] Production state documented
- [ ] Corrected migration tested on copy of production
- [ ] Application build verified against test database
- [ ] Recovery procedure reviewed by team
- [ ] Deployment window scheduled
