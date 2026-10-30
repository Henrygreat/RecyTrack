# ENCIF RecyTrack — Database Migration Safety Rules

## Mandatory Requirements

These rules apply to ALL database migrations for RecyTrack. Violations have caused production failures in Phases 3 and 4.

### Before Generating Any Migration

1. **Inspect existing schema** - Review the Prisma schema, previous migration files, and actual database structure.

2. **Check object existence** - Verify whether every required table, column, index, primary key, unique constraint, enum value, and foreign key already exists.

3. **Create only what's missing** - Where an object is missing, generate the appropriate migration to create it. Where it exists, preserve it.

4. **Verify FK prerequisites** - Before adding a foreign key, verify that the referenced columns have a matching primary key or unique constraint.

5. **Composite FK validation** - For composite foreign keys, ensure the EXACT referenced column combination has the required unique constraint. PostgreSQL error E42830 indicates this is missing.

### Migration SQL Requirements

6. **Use IF NOT EXISTS** - Make migrations safely repeatable where PostgreSQL supports it (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, etc.)

7. **Use DO blocks for constraints** - Wrap constraint creation in DO blocks that check existence first:
   ```sql
   DO $$
   BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'constraint_name') THEN
           ALTER TABLE "Table" ADD CONSTRAINT "constraint_name" ...;
       END IF;
   END $$;
   ```

8. **Preserve production data** - All new columns must be nullable or have safe defaults. Never drop columns with data without explicit approval.

9. **Correct dependency order** - Create objects in this order:
   - Enums
   - Tables (independent first, then dependent)
   - Indexes (especially unique indexes required by FKs)
   - Foreign keys (only after all referenced unique constraints exist)

### Testing Requirements

10. **Test on staging first** - Test migrations against a production-like staging database before deployment.

11. **Require verified backup** - Never apply migrations to production without a verified backup.

12. **Block on validation failure** - Prevent production deployment when migration validation fails.

### Forbidden Operations

13. **Never use on production**:
    - `prisma db push`
    - `prisma migrate reset`
    - `prisma migrate dev`

14. **Never auto-resolve failures** - Never automatically mark a failed migration as applied or rolled back without verifying the actual database state.

---

## Composite Foreign Key Reference

RecyTrack uses multi-tenant isolation with composite foreign keys. The pattern is:

```prisma
// Prisma schema
model ChildTable {
  parentId       String
  organizationId String

  parent Parent @relation(fields: [parentId, organizationId], references: [id, organizationId])
}

model Parent {
  id             String @id
  organizationId String

  @@unique([id, organizationId])  // REQUIRED for composite FK
}
```

**Required SQL for the referenced table:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS "Parent_id_organizationId_key"
    ON "Parent"("id", "organizationId");
```

**This index MUST exist BEFORE creating the FK that references it.**

---

## Tables Requiring Composite Unique Indexes

These tables are referenced by composite FKs and MUST have `@@unique([id, organizationId])`:

| Table | Index Name | Status |
|-------|------------|--------|
| Organization | Primary key on `id` | Built-in |
| Customer | `Customer_id_organizationId_key` | Phase 1 |
| Site | `Site_id_organizationId_key` | Phase 2 |
| Collection | `Collection_id_organizationId_key` | Phase 3 |
| CollectionZone | `CollectionZone_id_organizationId_key` | Phase 3 |
| RouteDate | `RouteDate_id_organizationId_key` | Phase 3 |
| Asset | `Asset_id_organizationId_key` | Phase 4 |
| WarehouseLocation | `WarehouseLocation_id_organizationId_key` | Phase 4 |

---

## Migration Checklist

### Pre-Migration
- [ ] Reviewed Prisma schema changes
- [ ] Checked all FK references have matching unique constraints
- [ ] Created pre-migration validation script
- [ ] Tested on local database
- [ ] Tested on staging database (production copy)
- [ ] Verified backup exists and is restorable

### Migration Execution
- [ ] Ran pre-migration validation (all checks pass)
- [ ] Applied migration in transaction
- [ ] Ran post-migration verification (all checks pass)
- [ ] Verified application connects and functions

### Post-Migration
- [ ] Documented any manual interventions
- [ ] Updated this document if new patterns discovered
- [ ] Committed migration files to version control

---

## Recovery Procedures

### Failed Migration (Transaction Rolled Back)

If the entire migration rolled back atomically:

```sql
-- 1. Check migration state
SELECT * FROM "_prisma_migrations" WHERE migration_name = 'MIGRATION_NAME';

-- 2. If shows failed/incomplete, delete the record
DELETE FROM "_prisma_migrations" WHERE migration_name = 'MIGRATION_NAME';

-- 3. Fix the migration SQL
-- 4. Re-apply
```

### Partial Migration (DDL Auto-Committed)

If some objects were created before failure:

1. Run diagnostic queries to determine exact state
2. Create idempotent cleanup script
3. Create idempotent recovery script
4. Test on staging
5. Apply to production with team review

See `scripts/phase4-recovery-migration.sql` for an example.

---

## Phase-Specific Notes

### Phase 4 Lesson Learned

The Phase 4 migration failed because:
1. `AssetNote` and `AssetStatusChange` tables have FKs to `Asset(id, organizationId)`
2. The `Asset_id_organizationId_key` unique index was never created
3. PostgreSQL error E42830 was raised when creating the FK

**Fix**: Always create unique indexes BEFORE foreign keys that reference them.

---

## Contact

For migration issues, consult the team before attempting production fixes.
