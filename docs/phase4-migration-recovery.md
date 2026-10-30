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
-- Line 297-300 (first failure point)
ALTER TABLE "AssetNote"
    ADD CONSTRAINT "AssetNote_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId")
    REFERENCES "Asset"("id", "organizationId")  -- Requires unique index!

-- Line 333-336 (would also fail)
ALTER TABLE "AssetStatusChange"
    ADD CONSTRAINT "AssetStatusChange_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId")
    REFERENCES "Asset"("id", "organizationId")  -- Requires unique index!
```

---

## Recovery Scripts

Three scripts have been created in `scripts/`:

| Script | Purpose |
|--------|---------|
| `phase4-pre-migration-validation.sql` | Run BEFORE recovery to verify prerequisites |
| `phase4-recovery-migration.sql` | Safe idempotent recovery migration |
| `phase4-post-migration-verification.sql` | Run AFTER recovery to verify success |

---

## Recovery Procedure

### Prerequisites

1. **Create verified backup**
   ```bash
   pg_dump -h production-host -U user -d recytrack > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test backup restoration**
   ```bash
   createdb recytrack_backup_test
   psql -d recytrack_backup_test < backup_YYYYMMDD_HHMMSS.sql
   ```

### Step 1: Run Pre-Migration Validation

```bash
psql -h production-host -U user -d recytrack -f scripts/phase4-pre-migration-validation.sql
```

**Required results:**
- All prerequisite tables: EXISTS
- `Asset_id_organizationId_key`: MISSING (expected)
- Duplicate check: PASS (zero duplicates)
- Phase 4 tables: MISSING (expected if rolled back)

### Step 2: Test Recovery on Staging

```bash
# Create staging from production backup
pg_dump -h production-host -U user -d recytrack | psql -h staging-host -U user -d recytrack_staging

# Apply recovery migration
psql -h staging-host -U user -d recytrack_staging -f scripts/phase4-recovery-migration.sql

# Verify
psql -h staging-host -U user -d recytrack_staging -f scripts/phase4-post-migration-verification.sql

# Test application
DATABASE_URL="postgresql://user:pass@staging-host/recytrack_staging" npm run build
```

### Step 3: Apply to Production

**Only after staging succeeds and team review:**

```bash
# Apply recovery migration
psql -h production-host -U user -d recytrack -f scripts/phase4-recovery-migration.sql

# Verify
psql -h production-host -U user -d recytrack -f scripts/phase4-post-migration-verification.sql
```

### Step 4: Verify Application

```bash
# Restart application
# Test asset creation, listing, detail pages
# Monitor error logs
```

---

## What the Recovery Migration Does

1. **Removes failed migration record** from `_prisma_migrations`
2. **Creates enums** (AssetCategory, PhysicalCondition, etc.) if missing
3. **Extends AssetStatus enum** with new values
4. **Creates WarehouseLocation table** with indexes and FK
5. **Extends Asset table** with new columns
6. **Handles category migration** (TEXT → enum) if not already done
7. **Creates Asset indexes**
8. **Creates `Asset_id_organizationId_key` unique index** (THE FIX)
9. **Creates Asset FKs** to Customer, Site, WarehouseLocation
10. **Creates AssetNote table** with indexes and FKs
11. **Creates AssetStatusChange table** with indexes and FKs
12. **Records migration as applied** in Prisma history
13. **Verifies all objects** were created

---

## Rollback Plan

If recovery fails, the database remains in pre-Phase-4 state (the original migration rolled back). No additional rollback needed.

If recovery partially succeeds:

```sql
-- Manually remove Phase 4 objects (in reverse dependency order)
DROP TABLE IF EXISTS "AssetStatusChange";
DROP TABLE IF EXISTS "AssetNote";
ALTER TABLE "Asset" DROP CONSTRAINT IF EXISTS "Asset_warehouseLocationId_organizationId_fkey";
ALTER TABLE "Asset" DROP CONSTRAINT IF EXISTS "Asset_siteId_organizationId_fkey";
ALTER TABLE "Asset" DROP CONSTRAINT IF EXISTS "Asset_customerId_organizationId_fkey";
DROP INDEX IF EXISTS "Asset_id_organizationId_key";
DROP TABLE IF EXISTS "WarehouseLocation";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20241030000000_phase4_asset_tracking';
```

---

## Fixed Migration File

The original migration file has been corrected:

**File**: `prisma/migrations/20241030000000_phase4_asset_tracking/migration.sql`

**Change**: Added unique index creation at line 238:

```sql
-- ASSET COMPOSITE UNIQUE INDEX (REQUIRED FOR FKs)
CREATE UNIQUE INDEX IF NOT EXISTS "Asset_id_organizationId_key"
    ON "Asset"("id", "organizationId");
```

---

## Approval Checklist

- [ ] Backup created and verified
- [ ] Pre-migration validation passed
- [ ] Recovery tested on staging
- [ ] Application tested on staging
- [ ] Team reviewed recovery plan
- [ ] Production maintenance window scheduled
- [ ] Recovery applied to production
- [ ] Post-migration verification passed
- [ ] Application verified on production
