-- Phase 3 Step 2: Migrate CONFIRMED status to APPROVED
--
-- This migration runs AFTER the enum values have been committed.
-- PostgreSQL requires new enum values to be committed before they can be used in DML.
--
-- CONFIRMED is a legacy status from Phase 1/2 that is functionally equivalent to APPROVED.
-- This migration updates all existing CONFIRMED records to use the new APPROVED status.
--
-- Note: CONFIRMED remains in the enum for backwards compatibility with application code
-- that may still reference it. The application code treats CONFIRMED as an alias for APPROVED.

-- Migrate legacy CONFIRMED status to APPROVED
-- Safe: Only updates records that have CONFIRMED status
-- Idempotent: No-op if no CONFIRMED records exist or if already migrated
UPDATE "Collection"
SET status = 'APPROVED'
WHERE status = 'CONFIRMED';

-- Log migration for audit purposes (optional, uses RAISE NOTICE)
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  IF migrated_count > 0 THEN
    RAISE NOTICE 'Migrated % collection(s) from CONFIRMED to APPROVED', migrated_count;
  ELSE
    RAISE NOTICE 'No CONFIRMED collections to migrate';
  END IF;
END $$;
