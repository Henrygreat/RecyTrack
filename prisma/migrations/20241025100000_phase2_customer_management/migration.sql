-- Phase 2: Customer, Site and User Management Migration
-- This migration is additive and preserves existing data

-- ============================================
-- NEW ENUMS
-- ============================================

CREATE TYPE "CustomerRole" AS ENUM ('CUSTOMER_ADMIN', 'CUSTOMER_USER');
CREATE TYPE "CustomerType" AS ENUM ('BUSINESS', 'INDIVIDUAL');
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- ============================================
-- CUSTOMER TABLE EXTENSIONS
-- ============================================

-- Add new columns to Customer table
ALTER TABLE "Customer" ADD COLUMN "reference" TEXT;
ALTER TABLE "Customer" ADD COLUMN "customerType" "CustomerType" NOT NULL DEFAULT 'BUSINESS';
ALTER TABLE "Customer" ADD COLUMN "companyNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN "vatNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN "website" TEXT;
ALTER TABLE "Customer" ADD COLUMN "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "Customer" ADD COLUMN "notes" TEXT;
ALTER TABLE "Customer" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Generate reference codes for existing customers
-- Using a function to ensure sequential reference generation per organization
DO $$
DECLARE
    rec RECORD;
    counter INTEGER;
    org_id TEXT;
    current_org TEXT := '';
BEGIN
    counter := 0;
    FOR rec IN SELECT id, "organizationId" FROM "Customer" ORDER BY "organizationId", "createdAt" LOOP
        IF rec."organizationId" != current_org THEN
            current_org := rec."organizationId";
            counter := 0;
        END IF;
        counter := counter + 1;
        UPDATE "Customer" SET "reference" = 'CUST-' || LPAD(counter::TEXT, 4, '0') WHERE id = rec.id;
    END LOOP;
END $$;

-- Now make reference NOT NULL and add unique constraint
ALTER TABLE "Customer" ALTER COLUMN "reference" SET NOT NULL;
CREATE UNIQUE INDEX "Customer_organizationId_reference_key" ON "Customer"("organizationId", "reference");

-- Add status index
CREATE INDEX "Customer_organizationId_status_idx" ON "Customer"("organizationId", "status");

-- ============================================
-- SITE TABLE
-- ============================================

CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "collectionInstructions" TEXT,
    "vehicleAccessNotes" TEXT,
    "openingHours" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "zoneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Site_organizationId_reference_key" ON "Site"("organizationId", "reference");
CREATE UNIQUE INDEX "Site_id_organizationId_key" ON "Site"("id", "organizationId");
CREATE INDEX "Site_customerId_idx" ON "Site"("customerId");
CREATE INDEX "Site_organizationId_isActive_idx" ON "Site"("organizationId", "isActive");

ALTER TABLE "Site" ADD CONSTRAINT "Site_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Site" ADD CONSTRAINT "Site_customerId_organizationId_fkey"
    FOREIGN KEY ("customerId", "organizationId") REFERENCES "Customer"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Site" ADD CONSTRAINT "Site_zoneId_organizationId_fkey"
    FOREIGN KEY ("zoneId", "organizationId") REFERENCES "CollectionZone"("id", "organizationId") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- CUSTOMER CONTACT TABLE
-- ============================================

CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "jobTitle" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isBilling" BOOLEAN NOT NULL DEFAULT false,
    "isOperational" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerContact_id_organizationId_key" ON "CustomerContact"("id", "organizationId");
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");
CREATE INDEX "CustomerContact_siteId_idx" ON "CustomerContact"("siteId");
CREATE INDEX "CustomerContact_organizationId_isPrimary_idx" ON "CustomerContact"("organizationId", "isPrimary");

ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_organizationId_fkey"
    FOREIGN KEY ("customerId", "organizationId") REFERENCES "Customer"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_siteId_organizationId_fkey"
    FOREIGN KEY ("siteId", "organizationId") REFERENCES "Site"("id", "organizationId") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- CUSTOMER ACCESS TABLE
-- ============================================

CREATE TABLE "CustomerAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "CustomerRole" NOT NULL DEFAULT 'CUSTOMER_USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerAccess_userId_customerId_key" ON "CustomerAccess"("userId", "customerId");
CREATE INDEX "CustomerAccess_customerId_idx" ON "CustomerAccess"("customerId");
CREATE INDEX "CustomerAccess_organizationId_idx" ON "CustomerAccess"("organizationId");

ALTER TABLE "CustomerAccess" ADD CONSTRAINT "CustomerAccess_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerAccess" ADD CONSTRAINT "CustomerAccess_customerId_organizationId_fkey"
    FOREIGN KEY ("customerId", "organizationId") REFERENCES "Customer"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- SITE ACCESS TABLE
-- ============================================

CREATE TABLE "SiteAccess" (
    "id" TEXT NOT NULL,
    "customerAccessId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteAccess_customerAccessId_siteId_key" ON "SiteAccess"("customerAccessId", "siteId");
CREATE INDEX "SiteAccess_siteId_idx" ON "SiteAccess"("siteId");

ALTER TABLE "SiteAccess" ADD CONSTRAINT "SiteAccess_customerAccessId_fkey"
    FOREIGN KEY ("customerAccessId") REFERENCES "CustomerAccess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteAccess" ADD CONSTRAINT "SiteAccess_siteId_organizationId_fkey"
    FOREIGN KEY ("siteId", "organizationId") REFERENCES "Site"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CUSTOMER INVITATION TABLE
-- ============================================

CREATE TABLE "CustomerInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "siteId" TEXT,
    "email" TEXT NOT NULL,
    "role" "CustomerRole" NOT NULL DEFAULT 'CUSTOMER_USER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "invitedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerInvitation_token_key" ON "CustomerInvitation"("token");
CREATE INDEX "CustomerInvitation_token_idx" ON "CustomerInvitation"("token");
CREATE INDEX "CustomerInvitation_customerId_idx" ON "CustomerInvitation"("customerId");
CREATE INDEX "CustomerInvitation_email_idx" ON "CustomerInvitation"("email");
CREATE INDEX "CustomerInvitation_organizationId_expiresAt_idx" ON "CustomerInvitation"("organizationId", "expiresAt");

ALTER TABLE "CustomerInvitation" ADD CONSTRAINT "CustomerInvitation_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerInvitation" ADD CONSTRAINT "CustomerInvitation_customerId_organizationId_fkey"
    FOREIGN KEY ("customerId", "organizationId") REFERENCES "Customer"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerInvitation" ADD CONSTRAINT "CustomerInvitation_invitedByUserId_fkey"
    FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- AUDIT LOG INDEX FOR ENTITY LOOKUP
-- ============================================

CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
