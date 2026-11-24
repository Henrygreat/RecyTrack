-- Phase 6: Commercial Business Model Migration
--
-- This migration adds the commercial pricing and billing infrastructure:
-- - New enums for service types, charges, contracts, quotes
-- - Pricing policies and tiers
-- - Customer contracts with price overrides
-- - Quotations
-- - Collection charges and costs tracking
-- - Asset revenue tracking
-- - Customer rebates
-- - Commercial fields on Collection model
-- - Customer tier linkage
--
-- SAFETY NOTES:
-- - All new columns are nullable OR have safe defaults
-- - No existing data is modified or deleted
-- - All operations are additive
-- - Existing collections remain valid (contractId is nullable)
-- - Uses IF NOT EXISTS for idempotency

-- ============================================
-- SECTION 1: NEW ENUMS
-- ============================================

-- ServiceType enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceType') THEN
        CREATE TYPE "ServiceType" AS ENUM (
            'COLLECTION',
            'TRANSPORT_SCHEDULED',
            'TRANSPORT_DEDICATED',
            'TRANSPORT_URGENT',
            'DATA_ERASURE_STANDARD',
            'DATA_ERASURE_CERTIFIED',
            'PHYSICAL_DESTRUCTION',
            'INSPECTION',
            'STORAGE',
            'REMARKETING',
            'RECYCLING',
            'DOCUMENTATION'
        );
    END IF;
END $$;

-- ChargeType enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChargeType') THEN
        CREATE TYPE "ChargeType" AS ENUM (
            'FREE',
            'CONDITIONAL_FREE',
            'INCLUDED_IN_CONTRACT',
            'FIXED',
            'PER_ITEM',
            'PER_WEIGHT',
            'PER_DISTANCE',
            'PERCENTAGE',
            'QUOTE_REQUIRED',
            'CUSTOM'
        );
    END IF;
END $$;

-- ChargeCalculationBasis enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChargeCalculationBasis') THEN
        CREATE TYPE "ChargeCalculationBasis" AS ENUM (
            'FLAT',
            'TIERED',
            'SLIDING_SCALE',
            'MINIMUM_PLUS_UNIT'
        );
    END IF;
END $$;

-- ContractStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractStatus') THEN
        CREATE TYPE "ContractStatus" AS ENUM (
            'CONTRACT_DRAFT',
            'CONTRACT_PENDING',
            'CONTRACT_ACTIVE',
            'CONTRACT_EXPIRED',
            'CONTRACT_TERMINATED',
            'CONTRACT_SUSPENDED'
        );
    END IF;
END $$;

-- QuoteStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuoteStatus') THEN
        CREATE TYPE "QuoteStatus" AS ENUM (
            'QUOTE_DRAFT',
            'QUOTE_SENT',
            'QUOTE_ACCEPTED',
            'QUOTE_REJECTED',
            'QUOTE_EXPIRED',
            'QUOTE_SUPERSEDED'
        );
    END IF;
END $$;

-- CollectionCommercialType enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CollectionCommercialType') THEN
        CREATE TYPE "CollectionCommercialType" AS ENUM (
            'COMMERCIAL_STANDARD',
            'COMMERCIAL_CONTRACTED',
            'COMMERCIAL_QUOTED',
            'COMMERCIAL_AD_HOC'
        );
    END IF;
END $$;

-- ChargeableStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChargeableStatus') THEN
        CREATE TYPE "ChargeableStatus" AS ENUM (
            'CHARGEABLE_PENDING',
            'CHARGEABLE_FREE',
            'CHARGEABLE_CONDITIONAL',
            'CHARGEABLE_YES',
            'CHARGEABLE_QUOTED',
            'CHARGEABLE_WAIVED'
        );
    END IF;
END $$;

-- CostCategory enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CostCategory') THEN
        CREATE TYPE "CostCategory" AS ENUM (
            'COST_TRANSPORT_FUEL',
            'COST_TRANSPORT_VEHICLE',
            'COST_TRANSPORT_DRIVER',
            'COST_TRANSPORT_TOLLS',
            'COST_PROCESSING_LABOUR',
            'COST_PROCESSING_MATERIALS',
            'COST_DATA_ERASURE',
            'COST_DESTRUCTION',
            'COST_DISPOSAL',
            'COST_CERTIFICATION',
            'COST_OVERHEAD',
            'COST_OTHER'
        );
    END IF;
END $$;

-- RevenueCategory enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RevenueCategory') THEN
        CREATE TYPE "RevenueCategory" AS ENUM (
            'REVENUE_RESALE',
            'REVENUE_REFURBISHMENT',
            'REVENUE_PARTS',
            'REVENUE_SCRAP_METAL',
            'REVENUE_SCRAP_PLASTIC',
            'REVENUE_SCRAP_OTHER',
            'REVENUE_PRECIOUS_METALS',
            'REVENUE_SERVICE_FEE',
            'REVENUE_CERTIFICATE_FEE',
            'REVENUE_OTHER'
        );
    END IF;
END $$;

-- RebateStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RebateStatus') THEN
        CREATE TYPE "RebateStatus" AS ENUM (
            'REBATE_CALCULATED',
            'REBATE_PENDING_APPROVAL',
            'REBATE_APPROVED',
            'REBATE_PAID',
            'REBATE_CANCELLED'
        );
    END IF;
END $$;

-- ============================================
-- SECTION 2: PRICING POLICY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "PricingPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "PricingPolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PricingPolicy_organizationId_code_key" ON "PricingPolicy"("organizationId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "PricingPolicy_organizationId_name_key" ON "PricingPolicy"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "PricingPolicy_organizationId_isActive_idx" ON "PricingPolicy"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "PricingPolicy_organizationId_isDefault_idx" ON "PricingPolicy"("organizationId", "isDefault");

-- ============================================
-- SECTION 3: PRICING POLICY ITEM TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "PricingPolicyItem" (
    "id" TEXT NOT NULL,
    "pricingPolicyId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "serviceSubtype" TEXT,
    "chargeType" "ChargeType" NOT NULL,
    "calculationBasis" "ChargeCalculationBasis" NOT NULL DEFAULT 'FLAT',
    "baseRate" INTEGER,
    "unitRate" INTEGER,
    "minimumCharge" INTEGER,
    "maximumCharge" INTEGER,
    "tiers" JSONB,
    "percentage" DECIMAL(5,2),
    "freeConditions" JSONB,
    "description" TEXT,
    "internalNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingPolicyItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PricingPolicyItem_pricingPolicyId_serviceType_serviceSubtype_key"
    ON "PricingPolicyItem"("pricingPolicyId", "serviceType", "serviceSubtype");
CREATE INDEX IF NOT EXISTS "PricingPolicyItem_pricingPolicyId_isActive_idx" ON "PricingPolicyItem"("pricingPolicyId", "isActive");

-- ============================================
-- SECTION 4: CUSTOMER TIER TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CustomerTier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "pricingPolicyId" TEXT,
    "rebatePercentage" DECIMAL(5,2),
    "autoAssignCriteria" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerTier_organizationId_code_key" ON "CustomerTier"("organizationId", "code");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerTier_organizationId_name_key" ON "CustomerTier"("organizationId", "name");
CREATE INDEX IF NOT EXISTS "CustomerTier_organizationId_isActive_idx" ON "CustomerTier"("organizationId", "isActive");

-- ============================================
-- SECTION 5: CUSTOMER CONTRACT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CustomerContract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT,
    "contractType" TEXT,
    "pricingPolicyId" TEXT,
    "tierId" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'CONTRACT_DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalTermMonths" INTEGER,
    "renewalNoticeDays" INTEGER,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "creditLimit" INTEGER,
    "minimumVolume" JSONB,
    "volumeDiscounts" JSONB,
    "rebateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rebatePercentage" DECIMAL(5,2),
    "rebateThreshold" INTEGER,
    "freeCollectionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "freeCollectionTerms" JSONB,
    "documentUrl" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedByName" TEXT,
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "CustomerContract_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerContract_organizationId_reference_key" ON "CustomerContract"("organizationId", "reference");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerContract_id_organizationId_key" ON "CustomerContract"("id", "organizationId");
CREATE INDEX IF NOT EXISTS "CustomerContract_customerId_idx" ON "CustomerContract"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerContract_organizationId_status_idx" ON "CustomerContract"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "CustomerContract_organizationId_endDate_idx" ON "CustomerContract"("organizationId", "endDate");

-- ============================================
-- SECTION 6: CONTRACT PRICE OVERRIDE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "ContractPriceOverride" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "serviceSubtype" TEXT,
    "chargeType" "ChargeType" NOT NULL,
    "baseRate" INTEGER,
    "unitRate" INTEGER,
    "minimumCharge" INTEGER,
    "percentage" DECIMAL(5,2),
    "conditions" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractPriceOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContractPriceOverride_contractId_serviceType_serviceSubtype_key"
    ON "ContractPriceOverride"("contractId", "serviceType", "serviceSubtype");
CREATE INDEX IF NOT EXISTS "ContractPriceOverride_contractId_idx" ON "ContractPriceOverride"("contractId");

-- ============================================
-- SECTION 7: QUOTE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "Quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "contractId" TEXT,
    "reference" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'QUOTE_DRAFT',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "collectionId" TEXT,
    "description" TEXT,
    "paymentTerms" TEXT,
    "termsAndConditions" TEXT,
    "respondedAt" TIMESTAMP(3),
    "responseNotes" TEXT,
    "acceptedByName" TEXT,
    "acceptedByEmail" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Quote_organizationId_reference_key" ON "Quote"("organizationId", "reference");
CREATE UNIQUE INDEX IF NOT EXISTS "Quote_id_organizationId_key" ON "Quote"("id", "organizationId");
CREATE INDEX IF NOT EXISTS "Quote_customerId_idx" ON "Quote"("customerId");
CREATE INDEX IF NOT EXISTS "Quote_organizationId_status_idx" ON "Quote"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Quote_collectionId_idx" ON "Quote"("collectionId");

-- ============================================
-- SECTION 8: QUOTE ITEM TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- ============================================
-- SECTION 9: COLLECTION CHARGE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CollectionCharge" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT,
    "chargeType" "ChargeType" NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "isWaived" BOOLEAN NOT NULL DEFAULT false,
    "waiveReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionCharge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CollectionCharge_collectionId_idx" ON "CollectionCharge"("collectionId");
CREATE INDEX IF NOT EXISTS "CollectionCharge_organizationId_serviceType_idx" ON "CollectionCharge"("organizationId", "serviceType");

-- ============================================
-- SECTION 10: COLLECTION COST TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CollectionCost" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "costCategory" "CostCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "quantity" DECIMAL(10,3),
    "unit" TEXT,
    "unitCost" INTEGER,
    "sourceType" TEXT,
    "sourceReference" TEXT,
    "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" TEXT,
    "recordedByName" TEXT,
    "notes" TEXT,

    CONSTRAINT "CollectionCost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CollectionCost_collectionId_idx" ON "CollectionCost"("collectionId");
CREATE INDEX IF NOT EXISTS "CollectionCost_organizationId_costCategory_idx" ON "CollectionCost"("organizationId", "costCategory");
CREATE INDEX IF NOT EXISTS "CollectionCost_organizationId_incurredAt_idx" ON "CollectionCost"("organizationId", "incurredAt");

-- ============================================
-- SECTION 11: ASSET REVENUE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "AssetRevenue" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "revenueCategory" "RevenueCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "deductions" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "transactionType" TEXT,
    "transactionRef" TEXT,
    "transactionDate" TIMESTAMP(3),
    "buyerName" TEXT,
    "buyerReference" TEXT,
    "rebateApplicable" BOOLEAN NOT NULL DEFAULT false,
    "rebatePercentage" DECIMAL(5,2),
    "rebateAmount" INTEGER,
    "rebatePaid" BOOLEAN NOT NULL DEFAULT false,
    "rebatePaidAt" TIMESTAMP(3),
    "realizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" TEXT,
    "recordedByName" TEXT,
    "notes" TEXT,

    CONSTRAINT "AssetRevenue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AssetRevenue_assetId_idx" ON "AssetRevenue"("assetId");
CREATE INDEX IF NOT EXISTS "AssetRevenue_organizationId_revenueCategory_idx" ON "AssetRevenue"("organizationId", "revenueCategory");
CREATE INDEX IF NOT EXISTS "AssetRevenue_organizationId_realizedAt_idx" ON "AssetRevenue"("organizationId", "realizedAt");

-- ============================================
-- SECTION 12: CUSTOMER REBATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CustomerRebate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "assetCount" INTEGER NOT NULL DEFAULT 0,
    "totalAssetValue" INTEGER NOT NULL DEFAULT 0,
    "rebatePercentage" DECIMAL(5,2) NOT NULL,
    "calculatedAmount" INTEGER NOT NULL,
    "adjustments" INTEGER NOT NULL DEFAULT 0,
    "finalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "status" "RebateStatus" NOT NULL DEFAULT 'REBATE_CALCULATED',
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedByName" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidByUserId" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerRebate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerRebate_organizationId_reference_key" ON "CustomerRebate"("organizationId", "reference");
CREATE INDEX IF NOT EXISTS "CustomerRebate_customerId_idx" ON "CustomerRebate"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerRebate_organizationId_status_idx" ON "CustomerRebate"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "CustomerRebate_organizationId_periodEnd_idx" ON "CustomerRebate"("organizationId", "periodEnd");

-- ============================================
-- SECTION 13: ADD tierId TO CUSTOMER
-- ============================================

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "tierId" TEXT;
CREATE INDEX IF NOT EXISTS "Customer_tierId_idx" ON "Customer"("tierId");

-- ============================================
-- SECTION 14: ADD COMMERCIAL FIELDS TO COLLECTION
-- ============================================

-- Pricing context
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "contractId" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "quotationId" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "pricingPolicyId" TEXT;

-- Commercial classification (with safe defaults)
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "commercialType" "CollectionCommercialType" NOT NULL DEFAULT 'COMMERCIAL_STANDARD';
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "chargeableStatus" "ChargeableStatus" NOT NULL DEFAULT 'CHARGEABLE_PENDING';

-- Price breakdown (amounts in minor units - pence)
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "collectionCharge" INTEGER;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "transportCharge" INTEGER;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "dataServicesCharge" INTEGER;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "otherCharges" INTEGER;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "subtotalCharges" INTEGER;

-- Discounts
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "discountAmount" INTEGER;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "discountReason" TEXT;

-- Tax
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "taxRate" DECIMAL(5,2);
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "taxAmount" INTEGER;

-- Total
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "totalCharge" INTEGER;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'GBP';

-- Free collection tracking
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "isFreeCollection" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "freeCollectionReason" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "freeCollectionRuleId" TEXT;

-- Value offset
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "estimatedAssetValue" INTEGER;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "rebateAmount" INTEGER;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "netCustomerAmount" INTEGER;

-- Customer acceptance
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "chargesDisclosedAt" TIMESTAMP(3);
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "chargesAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "chargesAcceptedBy" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "chargesAcceptedMethod" TEXT;

-- Invoice tracking
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "invoiceRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;
ALTER TABLE "Collection" ADD COLUMN IF NOT EXISTS "invoiceStatus" TEXT;

-- Indexes for Collection commercial fields
CREATE INDEX IF NOT EXISTS "Collection_contractId_idx" ON "Collection"("contractId");
CREATE INDEX IF NOT EXISTS "Collection_chargeableStatus_idx" ON "Collection"("chargeableStatus");

-- ============================================
-- SECTION 15: FOREIGN KEY CONSTRAINTS
-- ============================================

-- PricingPolicy FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'PricingPolicy_organizationId_fkey'
    ) THEN
        ALTER TABLE "PricingPolicy"
        ADD CONSTRAINT "PricingPolicy_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- PricingPolicyItem FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'PricingPolicyItem_pricingPolicyId_fkey'
    ) THEN
        ALTER TABLE "PricingPolicyItem"
        ADD CONSTRAINT "PricingPolicyItem_pricingPolicyId_fkey"
        FOREIGN KEY ("pricingPolicyId") REFERENCES "PricingPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CustomerTier FKs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CustomerTier_organizationId_fkey'
    ) THEN
        ALTER TABLE "CustomerTier"
        ADD CONSTRAINT "CustomerTier_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CustomerTier_pricingPolicyId_fkey'
    ) THEN
        ALTER TABLE "CustomerTier"
        ADD CONSTRAINT "CustomerTier_pricingPolicyId_fkey"
        FOREIGN KEY ("pricingPolicyId") REFERENCES "PricingPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Customer tierId FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Customer_tierId_fkey'
    ) THEN
        ALTER TABLE "Customer"
        ADD CONSTRAINT "Customer_tierId_fkey"
        FOREIGN KEY ("tierId") REFERENCES "CustomerTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CustomerContract FKs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CustomerContract_organizationId_fkey'
    ) THEN
        ALTER TABLE "CustomerContract"
        ADD CONSTRAINT "CustomerContract_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CustomerContract_customerId_organizationId_fkey'
    ) THEN
        ALTER TABLE "CustomerContract"
        ADD CONSTRAINT "CustomerContract_customerId_organizationId_fkey"
        FOREIGN KEY ("customerId", "organizationId") REFERENCES "Customer"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CustomerContract_pricingPolicyId_fkey'
    ) THEN
        ALTER TABLE "CustomerContract"
        ADD CONSTRAINT "CustomerContract_pricingPolicyId_fkey"
        FOREIGN KEY ("pricingPolicyId") REFERENCES "PricingPolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CustomerContract_tierId_fkey'
    ) THEN
        ALTER TABLE "CustomerContract"
        ADD CONSTRAINT "CustomerContract_tierId_fkey"
        FOREIGN KEY ("tierId") REFERENCES "CustomerTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ContractPriceOverride FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'ContractPriceOverride_contractId_fkey'
    ) THEN
        ALTER TABLE "ContractPriceOverride"
        ADD CONSTRAINT "ContractPriceOverride_contractId_fkey"
        FOREIGN KEY ("contractId") REFERENCES "CustomerContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Quote FKs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Quote_organizationId_fkey'
    ) THEN
        ALTER TABLE "Quote"
        ADD CONSTRAINT "Quote_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Quote_customerId_organizationId_fkey'
    ) THEN
        ALTER TABLE "Quote"
        ADD CONSTRAINT "Quote_customerId_organizationId_fkey"
        FOREIGN KEY ("customerId", "organizationId") REFERENCES "Customer"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Quote_contractId_fkey'
    ) THEN
        ALTER TABLE "Quote"
        ADD CONSTRAINT "Quote_contractId_fkey"
        FOREIGN KEY ("contractId") REFERENCES "CustomerContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- QuoteItem FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'QuoteItem_quoteId_fkey'
    ) THEN
        ALTER TABLE "QuoteItem"
        ADD CONSTRAINT "QuoteItem_quoteId_fkey"
        FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CollectionCharge FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CollectionCharge_collectionId_organizationId_fkey'
    ) THEN
        ALTER TABLE "CollectionCharge"
        ADD CONSTRAINT "CollectionCharge_collectionId_organizationId_fkey"
        FOREIGN KEY ("collectionId", "organizationId") REFERENCES "Collection"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CollectionCost FKs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CollectionCost_collectionId_organizationId_fkey'
    ) THEN
        ALTER TABLE "CollectionCost"
        ADD CONSTRAINT "CollectionCost_collectionId_organizationId_fkey"
        FOREIGN KEY ("collectionId", "organizationId") REFERENCES "Collection"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CollectionCost_organizationId_fkey'
    ) THEN
        ALTER TABLE "CollectionCost"
        ADD CONSTRAINT "CollectionCost_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AssetRevenue FKs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'AssetRevenue_assetId_organizationId_fkey'
    ) THEN
        ALTER TABLE "AssetRevenue"
        ADD CONSTRAINT "AssetRevenue_assetId_organizationId_fkey"
        FOREIGN KEY ("assetId", "organizationId") REFERENCES "Asset"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'AssetRevenue_organizationId_fkey'
    ) THEN
        ALTER TABLE "AssetRevenue"
        ADD CONSTRAINT "AssetRevenue_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- CustomerRebate FKs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CustomerRebate_organizationId_fkey'
    ) THEN
        ALTER TABLE "CustomerRebate"
        ADD CONSTRAINT "CustomerRebate_organizationId_fkey"
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'CustomerRebate_customerId_organizationId_fkey'
    ) THEN
        ALTER TABLE "CustomerRebate"
        ADD CONSTRAINT "CustomerRebate_customerId_organizationId_fkey"
        FOREIGN KEY ("customerId", "organizationId") REFERENCES "Customer"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Collection contractId FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Collection_contractId_fkey'
    ) THEN
        ALTER TABLE "Collection"
        ADD CONSTRAINT "Collection_contractId_fkey"
        FOREIGN KEY ("contractId") REFERENCES "CustomerContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
