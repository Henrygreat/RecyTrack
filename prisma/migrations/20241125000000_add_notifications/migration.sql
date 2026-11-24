-- Add Notifications System Migration
--
-- This migration adds the notification system for user alerts:
-- - NotificationType enum for categorizing notifications
-- - Notification table for storing user notifications
-- - Proper indexes for efficient queries
-- - Foreign keys to Organization and User
--
-- SAFETY NOTES:
-- - All operations are additive (CREATE IF NOT EXISTS)
-- - No existing data is modified or deleted
-- - Uses IF NOT EXISTS for idempotency
-- - Safe to run multiple times

-- ============================================
-- SECTION 1: NotificationType ENUM
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        CREATE TYPE "NotificationType" AS ENUM (
            'COLLECTION_BOOKING',
            'COLLECTION_APPROVED',
            'COLLECTION_ASSIGNED',
            'COLLECTION_STATUS',
            'ROUTE_CHANGE',
            'CUSTOMER_REQUEST',
            'ERASURE_COMPLETE',
            'DESTRUCTION_COMPLETE',
            'COMPLIANCE_EXCEPTION',
            'APPROVAL_REQUIRED',
            'CERTIFICATE_ISSUED',
            'USER_INVITED',
            'SYSTEM'
        );
    END IF;
END $$;

-- ============================================
-- SECTION 2: Notification TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "entityType" TEXT,
    "entityId" TEXT,
    "actionUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- SECTION 3: INDEXES
-- ============================================

-- Index for fetching user's unread notifications (most common query)
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- Index for fetching organization notifications by date
CREATE INDEX IF NOT EXISTS "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");

-- Index for fetching user notifications by date
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- ============================================
-- SECTION 4: FOREIGN KEY CONSTRAINTS
-- ============================================

-- FK to Organization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Notification_organizationId_fkey'
    ) THEN
        ALTER TABLE "Notification"
        ADD CONSTRAINT "Notification_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- FK to User
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Notification_userId_fkey'
    ) THEN
        ALTER TABLE "Notification"
        ADD CONSTRAINT "Notification_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
