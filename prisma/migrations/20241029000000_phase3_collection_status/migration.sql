-- Phase 3: Collection Status Enum Extension
-- This migration adds new collection status values for the enhanced workflow
-- and migrates legacy CONFIRMED status to APPROVED
--
-- Collection Status Lifecycle:
-- DRAFT → REQUESTED → APPROVED → SCHEDULED → ASSIGNED → IN_TRANSIT → COLLECTED → RECEIVED → COMPLETED
--                                                                                              ↓
--                                                                               CANCELLED / EXCEPTION

-- Add new enum values to CollectionStatus
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL < 12
-- Using IF NOT EXISTS to make this migration idempotent

ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'REQUESTED';
ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'APPROVED' AFTER 'REQUESTED';
ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED' AFTER 'APPROVED';
ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'COMPLETED' AFTER 'RECEIVED';
ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'EXCEPTION' AFTER 'CANCELLED';

-- Migrate legacy CONFIRMED status to APPROVED
-- This ensures backwards compatibility with Phase 1/2 data
-- Only runs if CONFIRMED records exist (no-op if already migrated)
UPDATE "Collection"
SET status = 'APPROVED'
WHERE status = 'CONFIRMED';
