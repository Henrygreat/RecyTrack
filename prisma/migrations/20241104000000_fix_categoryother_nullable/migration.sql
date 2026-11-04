-- Fix: Remove NOT NULL constraint from categoryOther column
--
-- Root cause: In migration 20241030000000_phase4_asset_tracking, the original
-- "category" TEXT NOT NULL column was renamed to "categoryOther" but the NOT NULL
-- constraint was not dropped. The Prisma schema correctly defines categoryOther
-- as optional (String?), but the database still enforces NOT NULL.
--
-- This causes Prisma P2011 error when creating assets without categoryOther:
-- "Null constraint violation on the fields: (`categoryOther`)"
--
-- Intended behaviour:
-- - categoryOther is optional for standard categories (LAPTOP, DESKTOP, etc.)
-- - categoryOther is required by application validation when category is OTHER
-- - Empty categoryOther values are normalised to null
--
-- This migration is safe and additive:
-- - Does not delete data
-- - Does not modify existing values
-- - Only removes the NOT NULL constraint
-- - Existing non-null values remain unchanged

-- Drop the NOT NULL constraint from categoryOther
ALTER TABLE "Asset" ALTER COLUMN "categoryOther" DROP NOT NULL;

-- Verify the change
DO $$
DECLARE
    is_nullable TEXT;
BEGIN
    SELECT c.is_nullable INTO is_nullable
    FROM information_schema.columns c
    WHERE c.table_name = 'Asset' AND c.column_name = 'categoryOther';

    IF is_nullable != 'YES' THEN
        RAISE EXCEPTION 'Migration verification failed: categoryOther is still NOT NULL';
    END IF;

    RAISE NOTICE 'Migration verified: categoryOther is now nullable';
END $$;
