# Phase 4 Migration Comprehensive Audit

**Date:** 2024-10-30
**Migration:** `20241030000000_phase4_asset_tracking`
**PostgreSQL Error:** `E42830 — there is no unique constraint matching given keys for referenced table "Asset"`

---

## Executive Summary

The Phase 4 migration failed due to missing unique constraint prerequisites for composite foreign keys. Additional analysis reveals **6 critical issues** and **3 moderate issues** that must be addressed for safe recovery.

---

## Production Database State (Pre-Recovery)

| Object | Status |
|--------|--------|
| `Asset` table | EXISTS with original columns |
| `Asset.category` | TEXT (not converted to enum) |
| `Asset.collectionId` | Required (NOT NULL) |
| `AssetCategory` enum | MISSING |
| `PhysicalCondition` enum | MISSING |
| `FunctionalCondition` enum | MISSING |
| `DataBearingStatus` enum | MISSING |
| `DispositionOutcome` enum | MISSING |
| `WarehouseLocation` table | MISSING |
| `AssetNote` table | MISSING |
| `AssetStatusChange` table | MISSING |
| `Asset_id_organizationId_key` | MISSING |
| Prisma migration record | FAILED (incomplete) |

---

## Issue #1: Missing Unique Index for Composite FK (CRITICAL)

**Severity:** CRITICAL — Caused production failure

### Problem

Foreign keys referencing `Asset(id, organizationId)` require a unique constraint on that column combination. The original migration creates this index, but PostgreSQL DDL statements are auto-committed, and the FK creation failed before the index could be used.

### Failing SQL

```sql
-- Line 297-300 in original migration
ALTER TABLE "AssetNote"
    ADD CONSTRAINT "AssetNote_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId")
    REFERENCES "Asset"("id", "organizationId")  -- No unique constraint!
    ON DELETE CASCADE ON UPDATE CASCADE;
```

### Root Cause

PostgreSQL auto-commits DDL statements. The migration:
1. Created indexes up to line ~240
2. Attempted FK creation at line 246 (Asset→Customer)
3. FK succeeded because Customer_id_organizationId_key exists
4. Attempted FK at line 297 (AssetNote→Asset)
5. **FAILED** because Asset_id_organizationId_key wasn't created yet

Wait — the index IS created at line 238-239. Re-analyzing...

Actually, the Asset_id_organizationId_key IS in the migration. But checking the production state confirms it's MISSING. This means either:
1. The migration never reached that point, OR
2. The entire migration rolled back

Since PostgreSQL auto-commits DDL, the most likely explanation is the migration was run inside a transaction (Prisma's default behavior) and rolled back on first failure.

### Fix

The recovery migration must:
1. Create `Asset_id_organizationId_key` unique index FIRST
2. Verify it exists before creating any FK that references it

---

## Issue #2: ON DELETE SET NULL on Composite FK with Required Column (CRITICAL)

**Severity:** CRITICAL — Would cause runtime errors

### Problem

The migration and existing recovery script use `ON DELETE SET NULL` for composite foreign keys where `organizationId` is NOT NULL:

```sql
ALTER TABLE "Asset"
    ADD CONSTRAINT "Asset_customerId_organizationId_fkey"
    FOREIGN KEY ("customerId", "organizationId")
    REFERENCES "Customer"("id", "organizationId")
    ON DELETE SET NULL ON UPDATE CASCADE;  -- DANGEROUS!
```

### Why This Fails

When a Customer is deleted:
1. PostgreSQL attempts to SET NULL on the FK columns
2. It tries to set BOTH `customerId` AND `organizationId` to NULL
3. `organizationId` has a NOT NULL constraint
4. **ERROR: null value in column "organizationId" violates not-null constraint**

### Affected FKs in Migration

| FK Constraint | Current Action | Problem |
|---------------|----------------|---------|
| `Asset_customerId_organizationId_fkey` | SET NULL | Would null organizationId |
| `Asset_siteId_organizationId_fkey` | SET NULL | Would null organizationId |
| `Asset_warehouseLocationId_organizationId_fkey` | SET NULL | Would null organizationId |

### Fix

Use `ON DELETE RESTRICT` instead of `ON DELETE SET NULL`:

```sql
ALTER TABLE "Asset"
    ADD CONSTRAINT "Asset_customerId_organizationId_fkey"
    FOREIGN KEY ("customerId", "organizationId")
    REFERENCES "Customer"("id", "organizationId")
    ON DELETE RESTRICT ON UPDATE CASCADE;
```

This prevents orphaning and matches multi-tenant data integrity requirements.

### Prisma Schema Update Required

The Prisma schema must also be updated to match:

```prisma
// Current (implicit SetNull for optional relations - WRONG)
customer Customer? @relation(fields: [customerId, organizationId], references: [id, organizationId])

// Fixed (explicit Restrict)
customer Customer? @relation(fields: [customerId, organizationId], references: [id, organizationId], onDelete: Restrict)
```

---

## Issue #3: AssetStatus Enum Value Mismatch (MODERATE)

**Severity:** MODERATE — Schema drift, no immediate failure

### Problem

The database has enum values that don't match the Prisma schema.

**Init migration created:**
```sql
CREATE TYPE "AssetStatus" AS ENUM (
    'EXPECTED', 'COLLECTED', 'RECEIVED', 'INSPECTION',
    'DATA_ERASURE', 'REUSE', 'RECYCLE', 'RELEASED'
);
```

**Prisma schema expects:**
```prisma
enum AssetStatus {
  EXPECTED
  COLLECTED
  RECEIVED
  INSPECTION
  DATA_ERASURE
  PROCESSING    -- Added Phase 4
  READY         -- Added Phase 4
  LISTED        -- Added Phase 4
  SOLD          -- Added Phase 4
  RECYCLED      -- Added Phase 4 (note: different from RECYCLE!)
  DESTROYED     -- Added Phase 4
  RETURNED      -- Added Phase 4
  RELEASED      -- Original
}
```

**Database will have after Phase 4:**
```
EXPECTED, COLLECTED, RECEIVED, INSPECTION, DATA_ERASURE,
REUSE,        -- Legacy, not in Prisma schema
RECYCLE,      -- Legacy, not in Prisma schema (RECYCLED is different!)
RELEASED,
PROCESSING, READY, LISTED, SOLD, RECYCLED, DESTROYED, RETURNED
```

### Impact

- `REUSE` and `RECYCLE` exist in database but not Prisma schema
- PostgreSQL cannot remove enum values
- Prisma introspection will show schema drift
- No runtime errors unless code uses REUSE/RECYCLE values

### Fix

Option A: Accept the drift (values unused, harmless)
Option B: Create migration to rename RECYCLE→RECYCLED if any data uses it
Option C: Document as known drift

**Recommendation:** Option A with documentation. The legacy values are not used.

---

## Issue #4: Category Column Migration Not Fully Idempotent (MODERATE)

**Severity:** MODERATE — Could fail on re-run

### Problem

The category migration checks `WHERE udt_name = 'text'`, but doesn't handle all partial states:

| State | category col | categoryOther col | categoryEnum col | Handled? |
|-------|--------------|-------------------|------------------|----------|
| Pre-migration | TEXT, exists | — | — | Yes |
| Post-migration | enum, exists | TEXT, exists | — | Yes |
| Partial: renamed | — | TEXT, exists | enum, exists | **NO** |
| Partial: not renamed | TEXT, exists | — | enum, exists | **NO** |

### Fix

Add comprehensive state detection:

```sql
DO $$
BEGIN
    -- State 1: Original (category is TEXT, no categoryOther)
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'Asset' AND column_name = 'category' AND udt_name = 'text')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'Asset' AND column_name = 'categoryOther')
    THEN
        -- Full migration needed
        ...
    -- State 2: Partial (categoryEnum exists but not renamed)
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'Asset' AND column_name = 'categoryEnum')
    THEN
        -- Just complete the rename
        ALTER TABLE "Asset" RENAME COLUMN "category" TO "categoryOther";
        ALTER TABLE "Asset" RENAME COLUMN "categoryEnum" TO "category";
    -- State 3: Complete (category is enum, categoryOther exists)
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'Asset' AND column_name = 'category' AND udt_name = 'assetcategory')
    THEN
        RAISE NOTICE 'Category migration already complete';
    END IF;
END $$;
```

---

## Issue #5: Missing categoryOther Column Check (LOW)

**Severity:** LOW — Would be created during rename

### Problem

The Prisma schema expects `categoryOther String?` but this column only exists after the category column rename. If running on a fresh database, the migration works. But validation scripts should verify this.

### Fix

Already handled by the category migration logic — the old TEXT column becomes categoryOther.

---

## Issue #6: Existing Asset→Collection FK Uses ON DELETE RESTRICT (LOW)

**Severity:** LOW — Correct behavior, document for awareness

### Problem

The init migration created:
```sql
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_collectionId_organizationId_fkey"
    FOREIGN KEY ("collectionId", "organizationId")
    REFERENCES "Collection"("id", "organizationId")
    ON DELETE RESTRICT ON UPDATE CASCADE;
```

Phase 4 makes `collectionId` nullable, but the FK still has RESTRICT. This means:
- You cannot delete a Collection that has Assets
- You must unlink Assets first

### Impact

This is actually **correct behavior** for ITAD — you shouldn't delete collections without processing assets. No fix needed, but document for operators.

---

## Issue #7: Recovery Script Uses Wrong Referential Action (CRITICAL)

**Severity:** CRITICAL — Inherited from Issue #2

The existing `phase4-recovery-migration.sql` uses `ON DELETE SET NULL` for Asset FKs. This must be corrected to `ON DELETE RESTRICT`.

---

## Issue #8: Transaction Boundary for ALTER TYPE (MODERATE)

**Severity:** MODERATE — Could cause transaction failure

### Problem

`ALTER TYPE ... ADD VALUE` cannot run inside a transaction in PostgreSQL < 12. Prisma runs migrations in transactions by default.

```sql
-- These statements cannot be inside BEGIN/COMMIT
ALTER TYPE "AssetStatus" ADD VALUE IF NOT EXISTS 'PROCESSING' AFTER 'DATA_ERASURE';
```

### Fix

The recovery migration should either:
1. Run outside a transaction, OR
2. Use separate execution for ALTER TYPE statements

PostgreSQL 12+ allows ADD VALUE in transactions, but we should verify the production version.

---

## Issue #9: Prisma Schema Missing onDelete Specifications (CRITICAL)

**Severity:** CRITICAL — Causes schema/migration mismatch

### Current Prisma Schema

```prisma
customer          Customer?           @relation(fields: [customerId, organizationId], references: [id, organizationId])
site              Site?               @relation(fields: [siteId, organizationId], references: [id, organizationId])
warehouseLocation WarehouseLocation?  @relation(fields: [warehouseLocationId, organizationId], references: [id, organizationId])
```

### Required Fix

```prisma
customer          Customer?           @relation(fields: [customerId, organizationId], references: [id, organizationId], onDelete: Restrict)
site              Site?               @relation(fields: [siteId, organizationId], references: [id, organizationId], onDelete: Restrict)
warehouseLocation WarehouseLocation?  @relation(fields: [warehouseLocationId, organizationId], references: [id, organizationId], onDelete: Restrict)
```

---

## Summary of Required Fixes

### Migration SQL Fixes

1. Create `Asset_id_organizationId_key` unique index before any FK that references it
2. Change `ON DELETE SET NULL` to `ON DELETE RESTRICT` for all composite FKs on Asset
3. Make category migration fully idempotent with state detection
4. Use DO blocks with constraint existence checks for all FKs

### Prisma Schema Fixes

1. Add `onDelete: Restrict` to Asset→Customer relation
2. Add `onDelete: Restrict` to Asset→Site relation
3. Add `onDelete: Restrict` to Asset→WarehouseLocation relation

### Recovery Migration Fixes

1. Update existing `phase4-recovery-migration.sql` with correct referential actions
2. Add pre-flight verification for all prerequisites
3. Add rollback-safe transaction handling

---

## Dependency Order (Correct)

```
1. Enums (AssetCategory, PhysicalCondition, FunctionalCondition, DataBearingStatus, DispositionOutcome)
2. ALTER TYPE AssetStatus ADD VALUES (outside transaction if PG < 12)
3. WarehouseLocation table + indexes + Organization FK
4. WarehouseLocation_id_organizationId_key unique index
5. Asset column additions
6. Asset category TEXT→enum conversion
7. Asset indexes
8. Asset_id_organizationId_key unique index (CRITICAL - before FKs)
9. Asset FKs (→Customer, →Site, →WarehouseLocation) with ON DELETE RESTRICT
10. AssetNote table + indexes
11. AssetNote FKs (→Organization, →Asset)
12. AssetStatusChange table + indexes
13. AssetStatusChange FKs (→Organization, →Asset)
14. Record migration as applied
15. Verification
```

---

## Next Steps

1. [ ] Update Prisma schema with correct onDelete actions
2. [ ] Create corrected recovery migration
3. [ ] Test on disposable PostgreSQL database
4. [ ] Validate Prisma schema sync
5. [ ] Run application build
6. [ ] Document deployment procedure
