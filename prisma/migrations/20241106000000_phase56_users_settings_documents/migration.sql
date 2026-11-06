-- Phase 5.6: Users Management, Organisation Settings, Document Management
--
-- This migration adds:
-- 1. User activity tracking fields (lastLoginAt, lastActiveAt)
-- 2. Membership lifecycle fields (isActive, timestamps, deactivation tracking)
-- 3. Organisation profile, branding, and settings fields
-- 4. StaffInvitation table for staff onboarding
-- 5. Document management system with versioning
--
-- SAFETY NOTES:
-- - All new columns are nullable OR have safe defaults
-- - No existing data is modified or deleted
-- - All operations are additive
-- - Existing users, memberships, assets, collections are preserved
--
-- ROLLBACK: Each section can be reversed with DROP COLUMN/TABLE statements

-- ============================================
-- SECTION 1: User Activity Tracking
-- ============================================
-- Adds optional timestamps for login/activity tracking
-- Safe: Both columns are nullable, no impact on existing rows

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);

-- ============================================
-- SECTION 2: Membership Lifecycle Management
-- ============================================
-- Adds fields for tracking membership status and deactivation
-- Safe: isActive defaults to true (existing members remain active)
-- Safe: createdAt defaults to now() for new rows, existing rows get current timestamp
-- Safe: updatedAt managed by application, nullable timestamps for deactivation

-- Add isActive with default true (all existing memberships remain active)
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Add createdAt - for existing rows, we'll set to current timestamp
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add updatedAt - for existing rows, set to current timestamp
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add deactivation tracking (nullable - only set when deactivated)
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "deactivatedById" TEXT;

-- Add foreign key for deactivatedBy (references User)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Membership_deactivatedById_fkey'
    ) THEN
        ALTER TABLE "Membership"
        ADD CONSTRAINT "Membership_deactivatedById_fkey"
        FOREIGN KEY ("deactivatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add index for isActive filtering
CREATE INDEX IF NOT EXISTS "Membership_organizationId_isActive_idx"
    ON "Membership"("organizationId", "isActive");

-- ============================================
-- SECTION 3: Organisation Profile & Settings
-- ============================================
-- Adds profile information, branding, and JSON settings
-- Safe: All columns are nullable, no impact on existing organisations

-- Add updatedAt (managed by application)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Profile Information
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "tradingName" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "registrationNumber" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "vatNumber" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "registeredAddress" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "operationalAddress" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Branding
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "documentHeader" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "documentFooter" TEXT;

-- Settings (JSON for flexibility)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "settings" JSONB;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "notifications" JSONB;

-- ============================================
-- SECTION 4: Staff Invitation System
-- ============================================
-- Creates table for inviting staff members to join organisation
-- Safe: New table, no impact on existing data

CREATE TABLE IF NOT EXISTS "StaffInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'OPERATIONS',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Email delivery tracking
    "emailSentAt" TIMESTAMP(3),
    "emailMessageId" TEXT,
    "emailDeliveredAt" TIMESTAMP(3),
    "emailFailedAt" TIMESTAMP(3),
    "emailFailureReason" TEXT,
    "lastResendAt" TIMESTAMP(3),
    "resendCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StaffInvitation_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on token
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'StaffInvitation_token_key'
    ) THEN
        ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_token_key" UNIQUE ("token");
    END IF;
END $$;

-- Foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'StaffInvitation_organizationId_fkey'
    ) THEN
        ALTER TABLE "StaffInvitation"
        ADD CONSTRAINT "StaffInvitation_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'StaffInvitation_invitedByUserId_fkey'
    ) THEN
        ALTER TABLE "StaffInvitation"
        ADD CONSTRAINT "StaffInvitation_invitedByUserId_fkey"
        FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "StaffInvitation_token_idx" ON "StaffInvitation"("token");
CREATE INDEX IF NOT EXISTS "StaffInvitation_email_idx" ON "StaffInvitation"("email");
CREATE INDEX IF NOT EXISTS "StaffInvitation_organizationId_expiresAt_idx" ON "StaffInvitation"("organizationId", "expiresAt");
CREATE INDEX IF NOT EXISTS "StaffInvitation_emailMessageId_idx" ON "StaffInvitation"("emailMessageId");

-- ============================================
-- SECTION 5: Document Management System
-- ============================================
-- Creates enums and table for document library with versioning
-- Safe: New enums and table, no impact on existing data

-- Create DocumentCategory enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentCategory') THEN
        CREATE TYPE "DocumentCategory" AS ENUM (
            'POLICY',
            'PROCEDURE',
            'TEMPLATE',
            'FORM',
            'CONTRACT',
            'COMPLIANCE',
            'TRAINING',
            'REPORT',
            'OTHER'
        );
    END IF;
END $$;

-- Create DocumentStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentStatus') THEN
        CREATE TYPE "DocumentStatus" AS ENUM (
            'DRAFT',
            'ACTIVE',
            'ARCHIVED',
            'DELETED'
        );
    END IF;
END $$;

-- Create Document table
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    -- Identification
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    -- Classification
    "category" "DocumentCategory" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Version control
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentDocumentId" TEXT,
    "isCurrentVersion" BOOLEAN NOT NULL DEFAULT true,

    -- File details
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "fileHash" TEXT,

    -- Ownership & approval
    "ownerUserId" TEXT,
    "ownerName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedByName" TEXT,

    -- Review cycle
    "effectiveDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),

    -- Access control
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "allowedRoles" "Role"[] DEFAULT ARRAY[]::"Role"[],

    -- Timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on reference + version per organization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Document_organizationId_reference_version_key'
    ) THEN
        ALTER TABLE "Document"
        ADD CONSTRAINT "Document_organizationId_reference_version_key"
        UNIQUE ("organizationId", "reference", "version");
    END IF;
END $$;

-- Foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Document_organizationId_fkey'
    ) THEN
        ALTER TABLE "Document"
        ADD CONSTRAINT "Document_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Document_parentDocumentId_fkey'
    ) THEN
        ALTER TABLE "Document"
        ADD CONSTRAINT "Document_parentDocumentId_fkey"
        FOREIGN KEY ("parentDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "Document_organizationId_category_idx" ON "Document"("organizationId", "category");
CREATE INDEX IF NOT EXISTS "Document_organizationId_status_idx" ON "Document"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Document_organizationId_isCurrentVersion_idx" ON "Document"("organizationId", "isCurrentVersion");
CREATE INDEX IF NOT EXISTS "Document_parentDocumentId_idx" ON "Document"("parentDocumentId");

-- ============================================
-- VERIFICATION
-- ============================================
-- Verify critical changes were applied

DO $$
DECLARE
    user_cols INTEGER;
    membership_cols INTEGER;
    org_cols INTEGER;
    staff_inv_exists BOOLEAN;
    document_exists BOOLEAN;
BEGIN
    -- Check User columns
    SELECT COUNT(*) INTO user_cols
    FROM information_schema.columns
    WHERE table_name = 'User' AND column_name IN ('lastLoginAt', 'lastActiveAt');

    IF user_cols < 2 THEN
        RAISE EXCEPTION 'User table migration failed: missing activity columns';
    END IF;

    -- Check Membership columns
    SELECT COUNT(*) INTO membership_cols
    FROM information_schema.columns
    WHERE table_name = 'Membership' AND column_name IN ('isActive', 'createdAt', 'updatedAt', 'deactivatedAt', 'deactivatedById');

    IF membership_cols < 5 THEN
        RAISE EXCEPTION 'Membership table migration failed: missing lifecycle columns';
    END IF;

    -- Check Organization columns
    SELECT COUNT(*) INTO org_cols
    FROM information_schema.columns
    WHERE table_name = 'Organization' AND column_name IN ('tradingName', 'settings', 'notifications');

    IF org_cols < 3 THEN
        RAISE EXCEPTION 'Organization table migration failed: missing settings columns';
    END IF;

    -- Check StaffInvitation table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'StaffInvitation'
    ) INTO staff_inv_exists;

    IF NOT staff_inv_exists THEN
        RAISE EXCEPTION 'StaffInvitation table was not created';
    END IF;

    -- Check Document table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'Document'
    ) INTO document_exists;

    IF NOT document_exists THEN
        RAISE EXCEPTION 'Document table was not created';
    END IF;

    RAISE NOTICE 'Phase 5.6 migration verified successfully';
    RAISE NOTICE '  - User: activity tracking columns added';
    RAISE NOTICE '  - Membership: lifecycle management columns added';
    RAISE NOTICE '  - Organization: profile, branding, settings columns added';
    RAISE NOTICE '  - StaffInvitation: table created';
    RAISE NOTICE '  - Document: table and enums created';
END $$;
