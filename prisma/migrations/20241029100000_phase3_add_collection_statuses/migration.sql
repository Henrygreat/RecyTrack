-- Phase 3 Step 1: Add new CollectionStatus enum values
--
-- This migration ONLY adds enum values. No DML statements.
-- PostgreSQL requires new enum values to be committed before use.
-- The data migration runs in a separate migration file.
--
-- Collection Status Lifecycle:
-- DRAFT → REQUESTED → APPROVED → SCHEDULED → ASSIGNED → IN_TRANSIT → COLLECTED → RECEIVED → COMPLETED
--                                                                                              ↓
--                                                                               CANCELLED / EXCEPTION
--
-- Production enum currently has:
-- REQUESTED, CONFIRMED, ASSIGNED, IN_TRANSIT, COLLECTED, RECEIVED, CANCELLED
--
-- Adding: DRAFT, APPROVED, SCHEDULED, COMPLETED, EXCEPTION

-- Add DRAFT status (for collections being prepared) - before REQUESTED
ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'REQUESTED';

-- Add APPROVED status (customer has approved the collection) - after REQUESTED
-- Note: CONFIRMED exists between REQUESTED and ASSIGNED in production
ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'APPROVED' AFTER 'REQUESTED';

-- Add SCHEDULED status (collection has been scheduled to a route date) - after APPROVED
ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED' AFTER 'APPROVED';

-- Add COMPLETED status (collection fully processed) - after RECEIVED
ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'COMPLETED' AFTER 'RECEIVED';

-- Add EXCEPTION status (collection has an issue requiring attention) - after CANCELLED
ALTER TYPE "CollectionStatus" ADD VALUE IF NOT EXISTS 'EXCEPTION' AFTER 'CANCELLED';

-- IMPORTANT: No UPDATE/INSERT/DELETE statements in this migration
-- Data migration occurs in the next migration after these values are committed
