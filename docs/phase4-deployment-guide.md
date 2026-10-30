# Phase 4 Production Deployment Guide

**Migration:** `20241030000000_phase4_asset_tracking`
**Recovery Script:** `scripts/phase4-recovery-migration-v2.sql`
**Date:** 2024-10-30

---

## Pre-Deployment Checklist

- [ ] Read and understood the [Migration Audit](./phase4-migration-audit.md)
- [ ] Recovery migration tested on staging
- [ ] Verified backup exists and is restorable
- [ ] Scheduled maintenance window
- [ ] Team notified of deployment
- [ ] Rollback plan reviewed

---

## Command Reference

### Read-Only Commands (Safe)

These commands do not modify the database:

```bash
# Check database status
psql -h <host> -U <user> -d <database> -c "SELECT version();"

# View migration history
psql -h <host> -U <user> -d <database> -c "SELECT * FROM \"_prisma_migrations\" ORDER BY started_at;"

# Run pre-migration validation
psql -h <host> -U <user> -d <database> -f scripts/phase4-pre-migration-validation.sql

# Check existing Asset indexes
psql -h <host> -U <user> -d <database> -c "SELECT indexname FROM pg_indexes WHERE tablename = 'Asset';"

# Check existing Asset columns
psql -h <host> -U <user> -d <database> -c "SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = 'Asset';"
```

### Modifying Commands (Requires Approval)

These commands modify the database:

```bash
# Create backup
pg_dump -h <host> -U <user> -d <database> -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Apply recovery migration
psql -h <host> -U <user> -d <database> -f scripts/phase4-recovery-migration-v2.sql

# Run post-migration verification
psql -h <host> -U <user> -d <database> -f scripts/phase4-post-migration-verification.sql
```

---

## Step 1: Create and Verify Backup

### 1.1 Create Backup

```bash
# Set connection variables
export PGHOST="your-production-host"
export PGUSER="your-database-user"
export PGDATABASE="your-database-name"

# Create timestamped backup
pg_dump -F c -f recytrack_backup_$(date +%Y%m%d_%H%M%S).dump

# Verify backup file was created
ls -la recytrack_backup_*.dump
```

### 1.2 Test Backup Restoration (CRITICAL)

```bash
# Create test database for backup verification
createdb recytrack_backup_verify

# Restore to test database
pg_restore -d recytrack_backup_verify recytrack_backup_YYYYMMDD_HHMMSS.dump

# Verify data exists
psql -d recytrack_backup_verify -c "SELECT COUNT(*) FROM \"Asset\";"
psql -d recytrack_backup_verify -c "SELECT COUNT(*) FROM \"Customer\";"
psql -d recytrack_backup_verify -c "SELECT COUNT(*) FROM \"Collection\";"

# Cleanup
dropdb recytrack_backup_verify
```

**STOP**: Do not proceed until backup restoration is verified.

---

## Step 2: Run Pre-Migration Validation

```bash
# Run validation (READ-ONLY)
psql -f scripts/phase4-pre-migration-validation.sql
```

### Expected Results

| Check | Expected |
|-------|----------|
| Prerequisite tables | EXISTS |
| Customer_id_organizationId_key | EXISTS |
| Site_id_organizationId_key | EXISTS |
| Collection_id_organizationId_key | EXISTS |
| Asset_id_organizationId_key | MISSING (will be created) |
| Duplicate Asset check | PASS (zero duplicates) |
| Phase 4 tables | MISSING (will be created) |
| Phase 4 enums | MISSING (will be created) |
| Asset.category type | TEXT (will be converted) |

**STOP**: Do not proceed if prerequisite indexes are missing or duplicates exist.

---

## Step 3: Apply Recovery Migration

### 3.1 Schedule Maintenance Window

- Notify users of scheduled downtime
- Stop application (prevents writes during migration)

### 3.2 Apply Migration

```bash
# Apply the recovery migration
psql -f scripts/phase4-recovery-migration-v2.sql
```

### Expected Output

The migration should complete with messages like:
```
NOTICE: Created AssetCategory enum
NOTICE: Created WarehouseLocation_organizationId_fkey
NOTICE: No duplicate Asset(id, organizationId) combinations found
NOTICE: Created Asset_customerId_organizationId_fkey with ON DELETE RESTRICT
...
NOTICE: All Phase 4 objects verified successfully
```

---

## Step 4: Run Post-Migration Verification

```bash
# Run verification (READ-ONLY)
psql -f scripts/phase4-post-migration-verification.sql
```

### Expected Results

| Check | Expected |
|-------|----------|
| Migration record | PASS: Applied successfully |
| Phase 4 enums | All PASS |
| Phase 4 tables | All PASS |
| Critical unique indexes | All PASS |
| Foreign keys | All PASS |
| Asset columns | All PASS |
| Data integrity | All PASS |

---

## Step 5: Verify FK Referential Actions

```bash
# Verify FKs use RESTRICT (not SET NULL)
psql -c "
SELECT conname AS constraint_name,
       CASE confdeltype
           WHEN 'r' THEN 'RESTRICT (correct)'
           WHEN 'n' THEN 'SET NULL (WRONG!)'
           ELSE confdeltype::text
       END AS on_delete
FROM pg_constraint
WHERE conname IN (
    'Asset_customerId_organizationId_fkey',
    'Asset_siteId_organizationId_fkey',
    'Asset_warehouseLocationId_organizationId_fkey'
);"
```

**Expected**: All three should show `RESTRICT (correct)`

---

## Step 6: Verify Application

### 6.1 Start Application

```bash
# If using Coolify, trigger redeployment
# The application will run prisma generate automatically
```

### 6.2 Test Key Functions

- [ ] Dashboard loads
- [ ] Asset list loads (`/dashboard/assets`)
- [ ] Can create new asset (`/dashboard/assets/new`)
- [ ] Can view asset detail (`/dashboard/assets/[id]`)
- [ ] Customer list loads
- [ ] Collection list loads

### 6.3 Verify No Console Errors

Check browser console and server logs for:
- No Prisma client errors
- No database connection errors
- No schema mismatch errors

---

## Rollback Procedure

If the migration fails or verification fails:

### Option A: Transaction Rolled Back (Migration Failed)

If the recovery migration failed and the transaction rolled back:

```bash
# 1. Check migration state
psql -c "SELECT * FROM \"_prisma_migrations\" WHERE migration_name = '20241030000000_phase4_asset_tracking';"

# 2. If record shows failed/incomplete, delete it
psql -c "DELETE FROM \"_prisma_migrations\" WHERE migration_name = '20241030000000_phase4_asset_tracking' AND finished_at IS NULL;"

# 3. Fix the issue (consult audit document)

# 4. Re-run migration
psql -f scripts/phase4-recovery-migration-v2.sql
```

### Option B: Partial Migration (Some Objects Created)

If some objects were created before failure:

```bash
# 1. Run cleanup script
psql <<EOF
-- Remove Phase 4 objects in reverse dependency order
DROP TABLE IF EXISTS "AssetStatusChange";
DROP TABLE IF EXISTS "AssetNote";
ALTER TABLE "Asset" DROP CONSTRAINT IF EXISTS "Asset_warehouseLocationId_organizationId_fkey";
ALTER TABLE "Asset" DROP CONSTRAINT IF EXISTS "Asset_siteId_organizationId_fkey";
ALTER TABLE "Asset" DROP CONSTRAINT IF EXISTS "Asset_customerId_organizationId_fkey";
DROP INDEX IF EXISTS "Asset_id_organizationId_key";
DROP TABLE IF EXISTS "WarehouseLocation";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20241030000000_phase4_asset_tracking';
EOF

# 2. Fix the issue

# 3. Re-run migration
psql -f scripts/phase4-recovery-migration-v2.sql
```

### Option C: Full Restore

If data was corrupted and needs full restore:

```bash
# 1. Drop database
dropdb <database>

# 2. Create fresh database
createdb <database>

# 3. Restore from backup
pg_restore -d <database> recytrack_backup_YYYYMMDD_HHMMSS.dump

# 4. Fix migration issues

# 5. Re-run all migrations
npx prisma migrate deploy
```

---

## Post-Deployment

After successful deployment:

1. [ ] Monitor application logs for 24 hours
2. [ ] Verify asset CRUD operations work correctly
3. [ ] Remove backup files from server (keep off-site copy)
4. [ ] Update deployment documentation
5. [ ] Close maintenance window

---

## Contact

For migration issues, consult the team before attempting production fixes.
