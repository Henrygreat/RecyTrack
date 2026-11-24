# RecyTrack Commercial Business Model - Technical Design

**Version:** 1.0
**Date:** 2026-11-24
**Status:** Draft for Review

---

## Table of Contents

1. [Overview](#1-overview)
2. [Design Principles](#2-design-principles)
3. [Organization Commercial Settings](#3-organization-commercial-settings)
4. [Pricing Models](#4-pricing-models)
5. [Collection Commercial Extension](#5-collection-commercial-extension)
6. [Cost & Revenue Tracking](#6-cost--revenue-tracking)
7. [Database Schema](#7-database-schema)
8. [Workflow Integration](#8-workflow-integration)
9. [Migration Strategy](#9-migration-strategy)

---

## 1. Overview

This document defines the technical design for RecyTrack's commercial business model, enabling:

- **Flexible pricing policies** at organization, service-type, and customer-tier levels
- **Free, conditional, and chargeable services** with clear eligibility rules
- **Operational cost tracking** separate from customer charges
- **Profitability analysis** at collection, customer, and service levels
- **Contract-based pricing** with customer-specific terms
- **Value-offset arrangements** including rebates and buyback credits

### Key Business Requirements

| Capability | Description |
|------------|-------------|
| Free Collections | Collections at no charge to customer |
| Conditionally Free | Free when eligibility criteria met |
| Chargeable Services | Fixed, per-item, per-weight, distance-based |
| Contract Pricing | Customer-specific negotiated rates |
| Operational Costs | Internal costs tracked separately |
| Rebates | Customer rebates on asset value |
| Profitability | Calculate margins per collection/customer |

---

## 2. Design Principles

### 2.1 Preserve Existing Functionality
- Existing booking workflow remains unchanged for free collections
- No breaking changes to current data or APIs
- New fields are optional with sensible defaults

### 2.2 Separation of Concerns
- **Pricing Policy**: Defines WHAT can be charged
- **Customer Contract**: Defines customer-specific terms
- **Collection Charges**: Records ACTUAL charges for a collection
- **Operational Costs**: Internal costs (never shown to customer)

### 2.3 Pricing Hierarchy
Pricing is determined by checking in order:
1. **Customer Contract** - Specific negotiated rates
2. **Customer Tier** - Tier-based pricing (e.g., Enterprise, SMB)
3. **Service Type** - Default pricing per service
4. **Organization Default** - Fallback pricing policy

### 2.4 Audit & Compliance
- All pricing decisions are logged
- Price changes require approval workflow
- Customer acceptance recorded before confirmation

---

## 3. Organization Commercial Settings

### 3.1 Commercial Settings Structure

Extend `Organization.settings` JSON with a `commercial` section:

```typescript
interface OrganizationCommercialSettings {
  // Global defaults
  defaultPricingPolicyId?: string;
  defaultCollectionPolicy: CollectionPricingPolicy;
  defaultTransportPolicy: TransportPricingPolicy;
  defaultDataServicesPolicy: DataServicesPricingPolicy;

  // Free collection eligibility (organization-wide defaults)
  freeCollectionEligibility: FreeCollectionEligibility;

  // Rebate settings
  rebateSettings: RebateSettings;

  // Quote requirements
  quoteRequirements: QuoteRequirements;

  // Tax settings
  taxSettings: TaxSettings;
}

interface CollectionPricingPolicy {
  defaultChargeType: 'FREE' | 'CONDITIONAL' | 'FIXED' | 'QUOTED';
  fixedCharge?: number;
  minimumCharge?: number;
  currency: string; // Default: 'GBP'
}

interface TransportPricingPolicy {
  scheduledRouteCharge: 'FREE' | 'FIXED' | 'DISTANCE';
  dedicatedCollectionCharge: 'FIXED' | 'DISTANCE' | 'QUOTED';
  urgentCollectionSurcharge?: number; // Percentage or fixed
  fixedRouteCharge?: number;
  dedicatedBaseCharge?: number;
  perMileRate?: number;
  freeRadiusMiles?: number; // Free within X miles
}

interface DataServicesPricingPolicy {
  standardErasure: 'FREE' | 'INCLUDED' | 'PER_ITEM' | 'QUOTED';
  certifiedErasure: 'FREE' | 'INCLUDED' | 'PER_ITEM' | 'QUOTED';
  physicalDestruction: 'FREE' | 'INCLUDED' | 'PER_ITEM' | 'QUOTED';
  standardErasureRate?: number;
  certifiedErasureRate?: number;
  physicalDestructionRate?: number;
}

interface FreeCollectionEligibility {
  enabled: boolean;
  rules: FreeCollectionRule[];
  evaluationMode: 'ALL' | 'ANY'; // All rules must match, or any rule
}

interface FreeCollectionRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: {
    // Equipment criteria
    minItemCount?: number;
    maxItemCount?: number;
    equipmentCategories?: string[]; // e.g., ['LAPTOP', 'SERVER']
    equipmentConditions?: string[]; // e.g., ['WORKING', 'PARTIAL']

    // Location criteria
    withinScheduledRoute?: boolean;
    maxDistanceMiles?: number;
    postcodeAreas?: string[]; // e.g., ['SW', 'W', 'NW']

    // Value criteria
    minEstimatedValue?: number;
    minRecoveryValue?: number;

    // Customer criteria
    customerTiers?: string[]; // e.g., ['ENTERPRISE', 'PARTNER']
    contractRequired?: boolean;
  };
  outcome: {
    collectionFree: boolean;
    transportFree: boolean;
    standardErasureFree: boolean;
    notes?: string;
  };
}

interface RebateSettings {
  enabled: boolean;
  defaultRebatePercentage?: number; // % of asset resale value
  minimumRebateThreshold?: number; // Minimum value before rebate applies
  rebatePaymentTerms?: string; // e.g., 'NET30'
}

interface QuoteRequirements {
  // When is a quote required?
  requireQuoteForDedicated: boolean;
  requireQuoteAboveItemCount?: number;
  requireQuoteAboveValue?: number;
  requireQuoteForCategories?: string[]; // e.g., ['HAZARDOUS']
  quoteValidityDays: number; // Default: 30
}

interface TaxSettings {
  defaultTaxRate: number; // e.g., 20 for 20% VAT
  taxRegistered: boolean;
  taxExemptServices?: string[];
}
```

### 3.2 Settings UI Location

Add a new "Commercial" tab to `/dashboard/settings/` with sections:
- Pricing Defaults
- Free Collection Rules
- Rebate Configuration
- Quote Settings
- Tax Settings

---

## 4. Pricing Models

### 4.1 Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│   PricingPolicy     │       │   CustomerTier      │
│─────────────────────│       │─────────────────────│
│ id                  │       │ id                  │
│ organizationId      │       │ organizationId      │
│ name                │       │ name                │
│ description         │       │ description         │
│ isDefault           │       │ pricingPolicyId ────┼──────┐
│ status              │       │ sortOrder           │      │
│ effectiveDate       │       └─────────────────────┘      │
│ ...                 │◄───────────────────────────────────┘
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐       ┌─────────────────────┐
│  PricingPolicyItem  │       │  CustomerContract   │
│─────────────────────│       │─────────────────────│
│ id                  │       │ id                  │
│ pricingPolicyId     │       │ organizationId      │
│ serviceType         │       │ customerId          │
│ chargeType          │       │ pricingPolicyId ────┼──────┐
│ rate                │       │ tierId              │      │
│ ...                 │       │ status              │      │
└─────────────────────┘       │ startDate           │      │
                              │ endDate             │      │
           ┌──────────────────│ contractTerms       │      │
           │                  └─────────────────────┘      │
           │                            │                  │
           │                            │ 1:N              │
           │                            ▼                  │
           │                  ┌─────────────────────┐      │
           │                  │ ContractPriceOverride│     │
           │                  │─────────────────────│      │
           │                  │ id                  │      │
           │                  │ contractId          │      │
           │                  │ serviceType         │      │
           │                  │ chargeType          │      │
           │                  │ rate                │      │
           │                  └─────────────────────┘      │
           │                                               │
           └───────────────────────────────────────────────┘
```

### 4.2 New Enums

```prisma
enum ServiceType {
  COLLECTION              // Collection service
  TRANSPORT_SCHEDULED     // Transport on scheduled route
  TRANSPORT_DEDICATED     // Dedicated/ad-hoc transport
  TRANSPORT_URGENT        // Urgent same-day transport
  DATA_ERASURE_STANDARD   // Standard data wipe
  DATA_ERASURE_CERTIFIED  // Certified erasure with certificate
  PHYSICAL_DESTRUCTION    // Physical media destruction
  INSPECTION              // Asset inspection service
  STORAGE                 // Warehouse storage
  REMARKETING             // Asset resale service
  RECYCLING               // Recycling processing
  DOCUMENTATION           // Certificate/documentation
}

enum ChargeType {
  FREE                    // No charge
  CONDITIONAL_FREE        // Free if conditions met
  INCLUDED_IN_CONTRACT    // Covered by contract
  FIXED                   // Fixed fee
  PER_ITEM                // Per item/unit charge
  PER_WEIGHT              // Per kg/tonne charge
  PER_DISTANCE            // Per mile/km charge
  PERCENTAGE              // Percentage of value
  QUOTE_REQUIRED          // Requires quotation
  CUSTOM                  // Custom calculation
}

enum ChargeCalculationBasis {
  FLAT                    // Single flat fee
  TIERED                  // Tiered pricing (quantity breaks)
  SLIDING_SCALE           // Sliding scale
  MINIMUM_PLUS_UNIT       // Minimum fee + per-unit
}

enum ContractStatus {
  DRAFT                   // Being negotiated
  PENDING_APPROVAL        // Awaiting approval
  ACTIVE                  // Currently active
  EXPIRED                 // Past end date
  TERMINATED              // Terminated early
  SUSPENDED               // Temporarily suspended
}

enum QuoteStatus {
  DRAFT                   // Being prepared
  SENT                    // Sent to customer
  ACCEPTED                // Customer accepted
  REJECTED                // Customer rejected
  EXPIRED                 // Past validity date
  SUPERSEDED              // Replaced by newer quote
}
```

### 4.3 PricingPolicy Model

```prisma
/// Organization-level pricing policy template
/// Can be assigned to customer tiers or individual customers
model PricingPolicy {
  id             String   @id @default(cuid())
  organizationId String

  // Identification
  name           String   // e.g., "Standard Pricing", "Enterprise Rates"
  code           String   // Short code e.g., "STD", "ENT"
  description    String?

  // Status
  isDefault      Boolean  @default(false)  // Organization default policy
  isActive       Boolean  @default(true)

  // Validity
  effectiveDate  DateTime?
  expiryDate     DateTime?

  // Version control
  version        Int      @default(1)
  previousVersionId String?

  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  createdByUserId String?
  createdByName  String?

  // Relations
  organization   Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  items          PricingPolicyItem[]
  tiers          CustomerTier[]
  contracts      CustomerContract[]

  @@unique([organizationId, code])
  @@unique([organizationId, name])
  @@index([organizationId, isActive])
  @@index([organizationId, isDefault])
}

/// Individual service pricing within a policy
model PricingPolicyItem {
  id              String   @id @default(cuid())
  pricingPolicyId String

  // Service identification
  serviceType     ServiceType
  serviceSubtype  String?   // For granular pricing e.g., "HDD" vs "SSD" destruction

  // Charge configuration
  chargeType      ChargeType
  calculationBasis ChargeCalculationBasis @default(FLAT)

  // Pricing (amounts in minor units, e.g., pence for GBP)
  baseRate        Int?      // Base/flat rate
  unitRate        Int?      // Per-unit rate
  minimumCharge   Int?      // Minimum charge
  maximumCharge   Int?      // Maximum/cap

  // For tiered pricing
  tiers           Json?     // Array of { minQty, maxQty, rate }

  // For percentage-based
  percentage      Decimal?  @db.Decimal(5, 2)  // e.g., 15.00 for 15%

  // Conditions for CONDITIONAL_FREE
  freeConditions  Json?     // Conditions that make this service free

  // Notes
  description     String?
  internalNotes   String?

  // Status
  isActive        Boolean   @default(true)
  sortOrder       Int       @default(0)

  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  pricingPolicy   PricingPolicy @relation(fields: [pricingPolicyId], references: [id], onDelete: Cascade)

  @@unique([pricingPolicyId, serviceType, serviceSubtype])
  @@index([pricingPolicyId, isActive])
}
```

### 4.4 CustomerTier Model

```prisma
/// Customer segmentation for tier-based pricing
model CustomerTier {
  id              String   @id @default(cuid())
  organizationId  String

  // Identification
  name            String   // e.g., "Enterprise", "SMB", "Partner"
  code            String   // Short code e.g., "ENT", "SMB", "PTR"
  description     String?

  // Pricing
  pricingPolicyId String?  // Default pricing for this tier

  // Rebate settings (can override org defaults)
  rebatePercentage Decimal? @db.Decimal(5, 2)

  // Auto-assignment criteria (optional)
  autoAssignCriteria Json?  // Rules for automatic tier assignment

  // Display
  sortOrder       Int      @default(0)
  isActive        Boolean  @default(true)

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  organization    Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  pricingPolicy   PricingPolicy?  @relation(fields: [pricingPolicyId], references: [id])
  customers       Customer[]
  contracts       CustomerContract[]

  @@unique([organizationId, code])
  @@unique([organizationId, name])
  @@index([organizationId, isActive])
}
```

### 4.5 CustomerContract Model

```prisma
/// Customer-specific contract with pricing terms
model CustomerContract {
  id              String         @id @default(cuid())
  organizationId  String
  customerId      String

  // Identification
  reference       String         // Contract reference e.g., "CON-0001"
  name            String?        // Contract name/description

  // Contract type
  contractType    String?        // e.g., "FRAMEWORK", "SPOT", "RETAINER"

  // Pricing basis
  pricingPolicyId String?        // Base pricing policy
  tierId          String?        // Customer tier (for reference)

  // Status
  status          ContractStatus @default(DRAFT)

  // Validity period
  startDate       DateTime
  endDate         DateTime?      // Null = no end date

  // Auto-renewal
  autoRenew       Boolean        @default(false)
  renewalTermMonths Int?
  renewalNoticeDays Int?         // Days notice before auto-renewal

  // Terms
  paymentTermsDays Int           @default(30)  // e.g., NET30
  currency        String         @default("GBP")

  // Credit limit
  creditLimit     Int?           // In minor units

  // Volume commitments
  minimumVolume   Json?          // { period: 'MONTHLY', items: 100 }
  volumeDiscounts Json?          // Tiered discounts based on volume

  // Rebate terms
  rebateEnabled   Boolean        @default(false)
  rebatePercentage Decimal?      @db.Decimal(5, 2)
  rebateThreshold Int?           // Minimum asset value for rebate

  // Free collection terms
  freeCollectionEnabled Boolean  @default(false)
  freeCollectionTerms   Json?    // Specific free collection rules

  // Document
  documentUrl     String?        // Link to signed contract

  // Approval
  approvedAt      DateTime?
  approvedByUserId String?
  approvedByName  String?

  // Termination
  terminatedAt    DateTime?
  terminationReason String?

  // Notes
  notes           String?
  internalNotes   String?

  // Timestamps
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  createdByUserId String?
  createdByName   String?

  // Relations
  organization    Organization           @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer        Customer               @relation(fields: [customerId, organizationId], references: [id, organizationId])
  pricingPolicy   PricingPolicy?         @relation(fields: [pricingPolicyId], references: [id])
  tier            CustomerTier?          @relation(fields: [tierId], references: [id])
  priceOverrides  ContractPriceOverride[]
  collections     Collection[]
  quotes          Quote[]

  @@unique([organizationId, reference])
  @@unique([id, organizationId])
  @@index([customerId])
  @@index([organizationId, status])
  @@index([organizationId, endDate])
}

/// Contract-specific price overrides
model ContractPriceOverride {
  id              String      @id @default(cuid())
  contractId      String

  // Service
  serviceType     ServiceType
  serviceSubtype  String?

  // Override pricing
  chargeType      ChargeType
  baseRate        Int?
  unitRate        Int?
  minimumCharge   Int?
  percentage      Decimal?    @db.Decimal(5, 2)

  // Conditions
  conditions      Json?       // Specific conditions for this override

  // Notes
  notes           String?

  // Timestamps
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  // Relations
  contract        CustomerContract @relation(fields: [contractId], references: [id], onDelete: Cascade)

  @@unique([contractId, serviceType, serviceSubtype])
  @@index([contractId])
}
```

### 4.6 Quote Model

```prisma
/// Quotation for services
model Quote {
  id              String      @id @default(cuid())
  organizationId  String
  customerId      String
  contractId      String?     // Optional link to contract

  // Identification
  reference       String      // Quote reference e.g., "QUO-0001"

  // Status
  status          QuoteStatus @default(DRAFT)

  // Validity
  issueDate       DateTime    @default(now())
  validUntil      DateTime

  // Totals (in minor units)
  subtotal        Int         @default(0)
  taxAmount       Int         @default(0)
  totalAmount     Int         @default(0)
  currency        String      @default("GBP")

  // Context
  collectionId    String?     // If quote is for a specific collection
  description     String?     // Quote description

  // Terms
  paymentTerms    String?
  termsAndConditions String?

  // Customer response
  respondedAt     DateTime?
  responseNotes   String?
  acceptedByName  String?
  acceptedByEmail String?

  // PDF
  pdfUrl          String?

  // Timestamps
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  createdByUserId String?
  createdByName   String?

  // Relations
  organization    Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer        Customer       @relation(fields: [customerId, organizationId], references: [id, organizationId])
  contract        CustomerContract? @relation(fields: [contractId], references: [id])
  items           QuoteItem[]
  collection      Collection?    @relation(fields: [collectionId, organizationId], references: [id, organizationId])

  @@unique([organizationId, reference])
  @@unique([id, organizationId])
  @@index([customerId])
  @@index([organizationId, status])
  @@index([collectionId])
}

/// Quote line items
model QuoteItem {
  id              String      @id @default(cuid())
  quoteId         String

  // Service
  serviceType     ServiceType
  description     String

  // Quantity
  quantity        Int         @default(1)
  unit            String?     // e.g., "items", "kg", "miles"

  // Pricing (in minor units)
  unitPrice       Int
  lineTotal       Int

  // Tax
  taxRate         Decimal     @db.Decimal(5, 2) @default(0)
  taxAmount       Int         @default(0)

  // Notes
  notes           String?

  // Order
  sortOrder       Int         @default(0)

  // Timestamps
  createdAt       DateTime    @default(now())

  // Relations
  quote           Quote       @relation(fields: [quoteId], references: [id], onDelete: Cascade)

  @@index([quoteId])
}
```

---

## 5. Collection Commercial Extension

### 5.1 Collection Model Extensions

Add the following fields to the existing `Collection` model:

```prisma
model Collection {
  // ... existing fields ...

  // ============================================
  // COMMERCIAL EXTENSION
  // ============================================

  // Pricing context
  contractId          String?           // Active contract at time of booking
  quotationId         String?           // If quote was required/provided
  pricingPolicyId     String?           // Applied pricing policy

  // Commercial classification
  commercialType      CollectionCommercialType @default(STANDARD)
  chargeableStatus    ChargeableStatus         @default(PENDING)

  // Price breakdown (amounts in minor units)
  collectionCharge    Int?              // Collection service charge
  transportCharge     Int?              // Transport charge
  dataServicesCharge  Int?              // Data erasure/destruction
  otherCharges        Int?              // Other service charges
  subtotalCharges     Int?              // Sum of above

  // Discounts
  discountAmount      Int?              // Total discounts applied
  discountReason      String?           // Why discount was applied

  // Tax
  taxRate             Decimal?          @db.Decimal(5, 2)
  taxAmount           Int?

  // Total
  totalCharge         Int?              // Final amount to charge
  currency            String            @default("GBP")

  // Free collection tracking
  isFreeCollection    Boolean           @default(true)  // Default: free
  freeCollectionReason String?          // Why it's free (rule that matched)
  freeCollectionRuleId String?          // Which rule made it free

  // Value offset
  estimatedAssetValue Int?              // Estimated recovery value
  rebateAmount        Int?              // Customer rebate amount
  netCustomerAmount   Int?              // Total charge minus rebate

  // Customer acceptance (for chargeable collections)
  chargesDisclosedAt  DateTime?         // When charges were shown
  chargesAcceptedAt   DateTime?         // When customer accepted
  chargesAcceptedBy   String?           // Who accepted
  chargesAcceptedMethod String?         // How they accepted (portal, email, phone)

  // Invoice tracking
  invoiceRequired     Boolean           @default(false)
  invoiceId           String?           // Link to invoice when generated
  invoiceStatus       String?           // PENDING, GENERATED, SENT, PAID

  // Relations
  contract            CustomerContract? @relation(fields: [contractId, organizationId], references: [id, organizationId])
  quotation           Quote?            @relation(...)
  charges             CollectionCharge[]
  costs               CollectionCost[]
}

enum CollectionCommercialType {
  STANDARD            // Regular collection
  CONTRACTED          // Under customer contract
  QUOTED              // Based on accepted quote
  AD_HOC              // One-off with custom pricing
}

enum ChargeableStatus {
  PENDING             // Not yet determined
  FREE                // Confirmed free
  CONDITIONAL_FREE    // Free because conditions met
  CHARGEABLE          // Will be charged
  QUOTED              // Charges per accepted quote
  WAIVED              // Charges waived (with reason)
}
```

### 5.2 CollectionCharge Model (Line Items)

```prisma
/// Itemized charges for a collection
model CollectionCharge {
  id              String      @id @default(cuid())
  collectionId    String
  organizationId  String

  // Service
  serviceType     ServiceType
  description     String

  // Quantity
  quantity        Int         @default(1)
  unit            String?

  // Pricing (in minor units)
  chargeType      ChargeType
  unitPrice       Int
  lineTotal       Int

  // Source
  sourceType      String      // 'POLICY', 'CONTRACT', 'QUOTE', 'MANUAL'
  sourceId        String?     // ID of pricing source

  // Tax
  taxRate         Decimal     @db.Decimal(5, 2) @default(0)
  taxAmount       Int         @default(0)

  // Status
  isWaived        Boolean     @default(false)
  waiveReason     String?

  // Notes
  notes           String?

  // Timestamps
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  // Relations
  collection      Collection  @relation(fields: [collectionId, organizationId], references: [id, organizationId], onDelete: Cascade)

  @@index([collectionId])
  @@index([organizationId, serviceType])
}
```

### 5.3 Pricing Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOOKING INITIATED                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. CHECK CUSTOMER CONTRACT                                      │
│     - Is there an active contract?                               │
│     - Does contract include free collections?                    │
│     - Are there contract-specific rates?                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. CHECK CUSTOMER TIER                                          │
│     - What tier is the customer?                                 │
│     - What pricing policy applies to tier?                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. EVALUATE FREE COLLECTION ELIGIBILITY                         │
│     - Check organization free collection rules                   │
│     - Evaluate against: items, categories, location, value       │
│     - If ANY rule matches → Mark as FREE                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                     ┌────────┴────────┐
                     │                 │
              [FREE ELIGIBLE]   [NOT FREE]
                     │                 │
                     ▼                 ▼
┌───────────────────────┐  ┌───────────────────────────────────────┐
│  4a. FREE PATH        │  │  4b. CHARGEABLE PATH                  │
│  - Set isFree=true    │  │  - Calculate charges per policy       │
│  - Record rule match  │  │  - Check if quote required            │
│  - Skip to confirm    │  │  - Calculate totals                   │
└───────────────────────┘  └───────────────────────────────────────┘
                                       │
                              ┌────────┴────────┐
                              │                 │
                       [QUOTE NEEDED]    [NO QUOTE]
                              │                 │
                              ▼                 ▼
                    ┌──────────────┐   ┌──────────────────────────┐
                    │ Generate     │   │ 5. DISCLOSE CHARGES      │
                    │ Quote        │   │    - Show breakdown      │
                    │ → Customer   │   │    - Get acceptance      │
                    │   accepts    │   │    - Record timestamp    │
                    └──────────────┘   └──────────────────────────┘
                              │                 │
                              └────────┬────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. CONFIRM BOOKING                                              │
│     - Create collection record                                   │
│     - Store pricing snapshot                                     │
│     - Set invoiceRequired flag                                   │
│     - Audit log                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Cost & Revenue Tracking

### 6.1 CollectionCost Model (Internal Costs)

```prisma
/// Internal operational costs (never shown to customer)
model CollectionCost {
  id              String      @id @default(cuid())
  collectionId    String
  organizationId  String

  // Cost category
  costCategory    CostCategory
  description     String

  // Amount (in minor units)
  amount          Int
  currency        String      @default("GBP")

  // Quantity basis
  quantity        Decimal?    @db.Decimal(10, 3)
  unit            String?     // e.g., "hours", "miles", "kg"
  unitCost        Int?

  // Source
  sourceType      String?     // 'ACTUAL', 'ESTIMATED', 'STANDARD'
  sourceReference String?     // e.g., fuel receipt, timesheet

  // Timestamps
  incurredAt      DateTime    @default(now())
  recordedAt      DateTime    @default(now())
  recordedByUserId String?
  recordedByName  String?

  // Notes
  notes           String?

  // Relations
  collection      Collection  @relation(fields: [collectionId, organizationId], references: [id, organizationId], onDelete: Cascade)

  @@index([collectionId])
  @@index([organizationId, costCategory])
  @@index([organizationId, incurredAt])
}

enum CostCategory {
  TRANSPORT_FUEL          // Fuel costs
  TRANSPORT_VEHICLE       // Vehicle costs (depreciation, maintenance)
  TRANSPORT_DRIVER        // Driver labour
  TRANSPORT_TOLLS         // Road tolls, congestion charges
  PROCESSING_LABOUR       // Warehouse/processing staff
  PROCESSING_MATERIALS    // Packaging, supplies
  DATA_ERASURE            // Erasure software/tools
  DESTRUCTION             // Destruction processing
  DISPOSAL                // Waste disposal
  CERTIFICATION           // Certificate generation
  OVERHEAD                // Allocated overhead
  OTHER                   // Other costs
}
```

### 6.2 AssetRevenue Model

```prisma
/// Revenue generated from assets
model AssetRevenue {
  id              String       @id @default(cuid())
  assetId         String
  organizationId  String

  // Revenue category
  revenueCategory RevenueCategory
  description     String

  // Amount (in minor units)
  grossAmount     Int          // Before any deductions
  deductions      Int          @default(0)  // Fees, commissions
  netAmount       Int          // After deductions
  currency        String       @default("GBP")

  // Related transaction
  transactionType String?      // 'SALE', 'SCRAP', 'REFUND'
  transactionRef  String?      // External reference
  transactionDate DateTime?

  // Buyer/recipient
  buyerName       String?
  buyerReference  String?

  // Customer rebate
  rebateApplicable Boolean     @default(false)
  rebatePercentage Decimal?    @db.Decimal(5, 2)
  rebateAmount    Int?
  rebatePaid      Boolean      @default(false)
  rebatePaidAt    DateTime?

  // Timestamps
  realizedAt      DateTime     @default(now())
  recordedAt      DateTime     @default(now())
  recordedByUserId String?
  recordedByName  String?

  // Notes
  notes           String?

  // Relations
  asset           Asset        @relation(fields: [assetId, organizationId], references: [id, organizationId], onDelete: Cascade)
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([assetId])
  @@index([organizationId, revenueCategory])
  @@index([organizationId, realizedAt])
}

enum RevenueCategory {
  RESALE              // Asset resale to buyer
  REFURBISHMENT       // Refurbished resale
  PARTS               // Parts/component sales
  SCRAP_METAL         // Scrap metal value
  SCRAP_PLASTIC       // Scrap plastic value
  SCRAP_OTHER         // Other scrap materials
  PRECIOUS_METALS     // Gold, silver, palladium recovery
  SERVICE_FEE         // Service fees charged
  CERTIFICATE_FEE     // Certificate fees
  OTHER               // Other revenue
}
```

### 6.3 CustomerRebate Model

```prisma
/// Customer rebate tracking
model CustomerRebate {
  id              String       @id @default(cuid())
  organizationId  String
  customerId      String

  // Identification
  reference       String       // Rebate reference e.g., "REB-0001"

  // Calculation basis
  periodStart     DateTime
  periodEnd       DateTime

  // Assets included
  assetCount      Int          @default(0)
  totalAssetValue Int          @default(0)  // Sum of asset revenues

  // Rebate calculation
  rebatePercentage Decimal     @db.Decimal(5, 2)
  calculatedAmount Int         // Calculated rebate
  adjustments     Int          @default(0)
  finalAmount     Int          // After adjustments
  currency        String       @default("GBP")

  // Status
  status          RebateStatus @default(CALCULATED)

  // Approval
  approvedAt      DateTime?
  approvedByUserId String?
  approvedByName  String?

  // Payment
  paidAt          DateTime?
  paidByUserId    String?
  paymentMethod   String?
  paymentReference String?

  // Notes
  notes           String?
  internalNotes   String?

  // Timestamps
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customer        Customer     @relation(fields: [customerId, organizationId], references: [id, organizationId])

  @@unique([organizationId, reference])
  @@index([customerId])
  @@index([organizationId, status])
  @@index([organizationId, periodEnd])
}

enum RebateStatus {
  CALCULATED        // Rebate calculated
  PENDING_APPROVAL  // Awaiting approval
  APPROVED          // Approved for payment
  PAID              // Payment made
  CANCELLED         // Rebate cancelled
}
```

### 6.4 Profitability Calculation

Profitability is calculated per collection using:

```typescript
interface CollectionProfitability {
  collectionId: string;
  customerId: string;

  // Revenue
  serviceRevenue: number;      // From CollectionCharge (if charged)
  assetRevenue: number;        // From AssetRevenue (sum)
  totalRevenue: number;

  // Costs
  transportCosts: number;      // From CollectionCost
  processingCosts: number;
  dataCosts: number;
  otherCosts: number;
  totalCosts: number;

  // Customer payments
  customerRebate: number;      // From CustomerRebate

  // Margin
  grossMargin: number;         // totalRevenue - totalCosts
  netMargin: number;           // grossMargin - customerRebate
  marginPercentage: number;    // netMargin / totalRevenue * 100

  // Status
  isComplete: boolean;         // All costs/revenue recorded
}
```

---

## 7. Database Schema

### 7.1 Complete Schema Additions

```prisma
// ============================================
// COMMERCIAL ENUMS
// ============================================

enum ServiceType {
  COLLECTION
  TRANSPORT_SCHEDULED
  TRANSPORT_DEDICATED
  TRANSPORT_URGENT
  DATA_ERASURE_STANDARD
  DATA_ERASURE_CERTIFIED
  PHYSICAL_DESTRUCTION
  INSPECTION
  STORAGE
  REMARKETING
  RECYCLING
  DOCUMENTATION
}

enum ChargeType {
  FREE
  CONDITIONAL_FREE
  INCLUDED_IN_CONTRACT
  FIXED
  PER_ITEM
  PER_WEIGHT
  PER_DISTANCE
  PERCENTAGE
  QUOTE_REQUIRED
  CUSTOM
}

enum ChargeCalculationBasis {
  FLAT
  TIERED
  SLIDING_SCALE
  MINIMUM_PLUS_UNIT
}

enum ContractStatus {
  DRAFT
  PENDING_APPROVAL
  ACTIVE
  EXPIRED
  TERMINATED
  SUSPENDED
}

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
  SUPERSEDED
}

enum CollectionCommercialType {
  STANDARD
  CONTRACTED
  QUOTED
  AD_HOC
}

enum ChargeableStatus {
  PENDING
  FREE
  CONDITIONAL_FREE
  CHARGEABLE
  QUOTED
  WAIVED
}

enum CostCategory {
  TRANSPORT_FUEL
  TRANSPORT_VEHICLE
  TRANSPORT_DRIVER
  TRANSPORT_TOLLS
  PROCESSING_LABOUR
  PROCESSING_MATERIALS
  DATA_ERASURE
  DESTRUCTION
  DISPOSAL
  CERTIFICATION
  OVERHEAD
  OTHER
}

enum RevenueCategory {
  RESALE
  REFURBISHMENT
  PARTS
  SCRAP_METAL
  SCRAP_PLASTIC
  SCRAP_OTHER
  PRECIOUS_METALS
  SERVICE_FEE
  CERTIFICATE_FEE
  OTHER
}

enum RebateStatus {
  CALCULATED
  PENDING_APPROVAL
  APPROVED
  PAID
  CANCELLED
}

// ============================================
// ORGANIZATION EXTENSIONS
// ============================================

// Add to Organization model relations:
//   customerTiers       CustomerTier[]
//   pricingPolicies     PricingPolicy[]
//   customerContracts   CustomerContract[]
//   quotes              Quote[]
//   customerRebates     CustomerRebate[]
//   assetRevenues       AssetRevenue[]

// ============================================
// CUSTOMER EXTENSIONS
// ============================================

// Add to Customer model:
//   tierId              String?
//   tier                CustomerTier?    @relation(...)
//   contracts           CustomerContract[]
//   quotes              Quote[]
//   rebates             CustomerRebate[]

// ============================================
// COLLECTION EXTENSIONS
// ============================================

// Add fields to Collection model as defined in Section 5.1

// ============================================
// ASSET EXTENSIONS
// ============================================

// Add to Asset model relations:
//   revenues            AssetRevenue[]
```

### 7.2 Indexes for Performance

```prisma
// Key indexes for commercial queries

// PricingPolicy
@@index([organizationId, isActive])
@@index([organizationId, isDefault])

// CustomerTier
@@index([organizationId, isActive])

// CustomerContract
@@index([customerId])
@@index([organizationId, status])
@@index([organizationId, endDate])

// Quote
@@index([customerId])
@@index([organizationId, status])
@@index([collectionId])

// CollectionCharge
@@index([collectionId])
@@index([organizationId, serviceType])

// CollectionCost
@@index([collectionId])
@@index([organizationId, costCategory])
@@index([organizationId, incurredAt])

// AssetRevenue
@@index([assetId])
@@index([organizationId, revenueCategory])
@@index([organizationId, realizedAt])

// CustomerRebate
@@index([customerId])
@@index([organizationId, status])
@@index([organizationId, periodEnd])
```

---

## 8. Workflow Integration

### 8.1 Customer Portal Booking Flow

The existing 3-step booking flow is preserved. For chargeable collections, an additional step is inserted:

```
STEP 1: Select Site           [UNCHANGED]
         │
         ▼
STEP 2: Choose Date           [UNCHANGED]
         │
         ▼
    ┌────┴────┐
    │ PRICING │ ← NEW: Calculate charges
    │ CHECK   │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
  [FREE]   [CHARGEABLE]
    │         │
    │         ▼
    │    STEP 2.5: Price Disclosure    ← NEW STEP
    │    - Show charge breakdown
    │    - Terms & conditions
    │    - Accept/Decline buttons
    │         │
    │         ▼
    │    [ACCEPTED] ─────────────┐
    │         │                  │
    └─────────┼──────────────────┘
              │
              ▼
STEP 3: Collection Details    [UNCHANGED]
         │
         ▼
STEP 4: Confirmation          [UNCHANGED]
```

### 8.2 Admin Workflow Changes

#### Collection List View
- Add column: "Charges" (FREE / £X.XX / QUOTED)
- Add filter: Chargeable Status
- Add filter: Has Contract

#### Collection Detail View
- New "Commercial" tab showing:
  - Applied pricing policy
  - Charge breakdown
  - Cost breakdown (staff only)
  - Profitability summary (admin only)

#### New Admin Pages
- `/dashboard/pricing` - Pricing policy management
- `/dashboard/contracts` - Customer contract management
- `/dashboard/quotes` - Quotation management
- `/dashboard/rebates` - Rebate tracking

### 8.3 API Endpoints

New server actions required:

```typescript
// Pricing
async function calculateCollectionPricing(siteId: string, details: BookingDetails): Promise<PricingResult>
async function evaluateFreeEligibility(customerId: string, details: BookingDetails): Promise<EligibilityResult>

// Contracts
async function getActiveContract(customerId: string): Promise<CustomerContract | null>
async function getApplicablePricing(customerId: string): Promise<ApplicablePricing>

// Quotes
async function createQuote(collectionId: string): Promise<Quote>
async function acceptQuote(quoteId: string, acceptance: Acceptance): Promise<void>

// Costs
async function recordCollectionCost(collectionId: string, cost: CostInput): Promise<CollectionCost>
async function getCollectionProfitability(collectionId: string): Promise<Profitability>

// Rebates
async function calculateRebate(customerId: string, period: Period): Promise<RebateCalculation>
async function approveRebate(rebateId: string): Promise<void>
```

---

## 9. Migration Strategy

### 9.1 Principles

1. **No breaking changes** to existing data
2. **Backward compatible** defaults
3. **Phased rollout** with feature flags
4. **Reversible** migrations

### 9.2 Migration Steps

#### Step 1: Schema Migration (Non-destructive)
- Add new models (PricingPolicy, CustomerTier, etc.)
- Add new fields to Collection (nullable)
- Add new fields to Customer (tierId, nullable)
- Create indexes

#### Step 2: Seed Default Data
- Create default "Standard" pricing policy (all services FREE)
- Create default "Standard" customer tier
- Set organization commercial settings with free defaults

#### Step 3: Backfill Existing Data
- Set `isFreeCollection = true` on all existing collections
- Set `chargeableStatus = 'FREE'` on all existing collections

#### Step 4: Enable Features (via feature flag)
- Pricing policy management (admin)
- Contract management (admin)
- Charge calculation (booking flow)
- Cost tracking (operations)

### 9.3 Rollback Plan

If issues arise:
1. Disable feature flags (immediate)
2. Keep new tables/fields but ignore them
3. Revert code if necessary (data preserved)

---

## Appendix A: Example Pricing Configurations

### A.1 Free-First ITAD (Default)

```json
{
  "defaultCollectionPolicy": {
    "defaultChargeType": "CONDITIONAL",
    "minimumCharge": 0
  },
  "freeCollectionEligibility": {
    "enabled": true,
    "evaluationMode": "ANY",
    "rules": [
      {
        "name": "Scheduled Route Collection",
        "conditions": {
          "withinScheduledRoute": true,
          "minItemCount": 1
        },
        "outcome": {
          "collectionFree": true,
          "transportFree": true,
          "standardErasureFree": true
        }
      },
      {
        "name": "High Value Collection",
        "conditions": {
          "minEstimatedValue": 50000
        },
        "outcome": {
          "collectionFree": true,
          "transportFree": true,
          "standardErasureFree": true
        }
      }
    ]
  }
}
```

### A.2 Volume-Based Pricing

```json
{
  "pricingPolicy": {
    "name": "Volume Tiered",
    "items": [
      {
        "serviceType": "COLLECTION",
        "chargeType": "PER_ITEM",
        "calculationBasis": "TIERED",
        "tiers": [
          { "minQty": 1, "maxQty": 10, "rate": 500 },
          { "minQty": 11, "maxQty": 50, "rate": 300 },
          { "minQty": 51, "maxQty": null, "rate": 150 }
        ]
      }
    ]
  }
}
```

### A.3 Enterprise Contract

```json
{
  "contract": {
    "name": "Enterprise Framework 2024",
    "freeCollectionEnabled": true,
    "freeCollectionTerms": {
      "scheduledRoutesOnly": false,
      "maxCollectionsPerMonth": 10,
      "includedServices": ["DATA_ERASURE_STANDARD", "DOCUMENTATION"]
    },
    "rebateEnabled": true,
    "rebatePercentage": 25.00,
    "rebateThreshold": 10000
  }
}
```

---

## Appendix B: UI Mockups Reference

### B.1 Price Disclosure Step (Portal)

```
┌─────────────────────────────────────────────────────────────┐
│  Collection Charges                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Your collection includes the following charges:             │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Dedicated Transport (15 miles)        £75.00        │    │
│  │ Data Erasure - Certified (est. 25)    £125.00       │    │
│  │                                       ─────────      │    │
│  │ Subtotal                              £200.00       │    │
│  │ VAT (20%)                             £40.00        │    │
│  │                                       ─────────      │    │
│  │ Total                                 £240.00       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  □ I accept these charges and the terms of service          │
│                                                              │
│  [Back]                              [Accept & Continue]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### B.2 Admin Commercial Tab

```
┌─────────────────────────────────────────────────────────────┐
│  Collection: COLL-0042  │ Details │ Assets │ Commercial │   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PRICING                                                     │
│  ───────                                                     │
│  Status: FREE (Scheduled Route)                              │
│  Policy: Standard Pricing                                    │
│  Contract: None                                              │
│                                                              │
│  CHARGES                        COSTS (Internal)             │
│  ───────                        ─────────────────            │
│  Collection:    £0.00           Transport:     £45.00        │
│  Transport:     £0.00           Driver:        £32.00        │
│  Data Services: £0.00           Processing:    £28.00        │
│  ─────────────────────          ─────────────────────        │
│  Total:         £0.00           Total Cost:    £105.00       │
│                                                              │
│  PROFITABILITY                                               │
│  ─────────────                                               │
│  Service Revenue:    £0.00                                   │
│  Asset Revenue:      £450.00  (from 12 assets)               │
│  Total Revenue:      £450.00                                 │
│  Total Costs:        £105.00                                 │
│  Customer Rebate:    £0.00                                   │
│  ─────────────────────────────────                           │
│  Net Margin:         £345.00  (76.7%)                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**End of Design Document**
