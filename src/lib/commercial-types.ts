/**
 * RecyTrack Commercial Business Model - TypeScript Types
 *
 * These types define the structure for organization-level commercial settings
 * stored in the Organization.settings JSON field.
 */

// ============================================
// PRICING ENUMS (mirror Prisma enums)
// ============================================

export type ServiceType =
  | 'COLLECTION'
  | 'TRANSPORT_SCHEDULED'
  | 'TRANSPORT_DEDICATED'
  | 'TRANSPORT_URGENT'
  | 'DATA_ERASURE_STANDARD'
  | 'DATA_ERASURE_CERTIFIED'
  | 'PHYSICAL_DESTRUCTION'
  | 'INSPECTION'
  | 'STORAGE'
  | 'REMARKETING'
  | 'RECYCLING'
  | 'DOCUMENTATION';

export type ChargeType =
  | 'FREE'
  | 'CONDITIONAL_FREE'
  | 'INCLUDED_IN_CONTRACT'
  | 'FIXED'
  | 'PER_ITEM'
  | 'PER_WEIGHT'
  | 'PER_DISTANCE'
  | 'PERCENTAGE'
  | 'QUOTE_REQUIRED'
  | 'CUSTOM';

export type ChargeableStatus =
  | 'PENDING'
  | 'FREE'
  | 'CONDITIONAL_FREE'
  | 'CHARGEABLE'
  | 'QUOTED'
  | 'WAIVED';

export type CollectionCommercialType =
  | 'STANDARD'
  | 'CONTRACTED'
  | 'QUOTED'
  | 'AD_HOC';

// ============================================
// ORGANIZATION COMMERCIAL SETTINGS
// ============================================

/**
 * Top-level commercial settings stored in Organization.settings.commercial
 */
export interface OrganizationCommercialSettings {
  /** Whether commercial features are enabled */
  enabled: boolean;

  /** Default pricing policy ID (from PricingPolicy table) */
  defaultPricingPolicyId?: string;

  /** Collection pricing defaults */
  defaultCollectionPolicy: CollectionPricingPolicy;

  /** Transport pricing defaults */
  defaultTransportPolicy: TransportPricingPolicy;

  /** Data services pricing defaults */
  defaultDataServicesPolicy: DataServicesPricingPolicy;

  /** Free collection eligibility rules */
  freeCollectionEligibility: FreeCollectionEligibility;

  /** Rebate configuration */
  rebateSettings: RebateSettings;

  /** Quote requirements */
  quoteRequirements: QuoteRequirements;

  /** Tax configuration */
  taxSettings: TaxSettings;

  /** Currency settings */
  currencySettings: CurrencySettings;
}

// ============================================
// PRICING POLICIES
// ============================================

export interface CollectionPricingPolicy {
  /** Default charge type for collections */
  defaultChargeType: 'FREE' | 'CONDITIONAL' | 'FIXED' | 'QUOTED';

  /** Fixed charge amount in pence (if defaultChargeType is FIXED) */
  fixedCharge?: number;

  /** Minimum charge in pence */
  minimumCharge?: number;
}

export interface TransportPricingPolicy {
  /** Pricing for scheduled route collections */
  scheduledRouteCharge: 'FREE' | 'FIXED' | 'DISTANCE';

  /** Pricing for dedicated/ad-hoc collections */
  dedicatedCollectionCharge: 'FIXED' | 'DISTANCE' | 'QUOTED';

  /** Surcharge for urgent collections (percentage or fixed pence) */
  urgentCollectionSurcharge?: number;
  urgentSurchargeType?: 'PERCENTAGE' | 'FIXED';

  /** Fixed charge for scheduled routes in pence */
  fixedRouteCharge?: number;

  /** Base charge for dedicated collections in pence */
  dedicatedBaseCharge?: number;

  /** Per-mile rate in pence */
  perMileRate?: number;

  /** Free collection within X miles */
  freeRadiusMiles?: number;
}

export interface DataServicesPricingPolicy {
  /** Standard data erasure pricing */
  standardErasure: 'FREE' | 'INCLUDED' | 'PER_ITEM' | 'QUOTED';

  /** Certified data erasure pricing */
  certifiedErasure: 'FREE' | 'INCLUDED' | 'PER_ITEM' | 'QUOTED';

  /** Physical destruction pricing */
  physicalDestruction: 'FREE' | 'INCLUDED' | 'PER_ITEM' | 'QUOTED';

  /** Per-item rate for standard erasure in pence */
  standardErasureRate?: number;

  /** Per-item rate for certified erasure in pence */
  certifiedErasureRate?: number;

  /** Per-item rate for physical destruction in pence */
  physicalDestructionRate?: number;
}

// ============================================
// FREE COLLECTION ELIGIBILITY
// ============================================

export interface FreeCollectionEligibility {
  /** Whether free collection rules are enabled */
  enabled: boolean;

  /** Rules for determining free eligibility */
  rules: FreeCollectionRule[];

  /** How rules are evaluated: ALL must match, or ANY rule matching triggers free */
  evaluationMode: 'ALL' | 'ANY';
}

export interface FreeCollectionRule {
  /** Unique identifier for this rule */
  id: string;

  /** Human-readable rule name */
  name: string;

  /** Whether this rule is active */
  enabled: boolean;

  /** Priority (lower = evaluated first) */
  priority: number;

  /** Conditions that must be met */
  conditions: FreeCollectionConditions;

  /** Outcome when conditions are met */
  outcome: FreeCollectionOutcome;
}

export interface FreeCollectionConditions {
  // ---- Equipment criteria ----
  /** Minimum number of items */
  minItemCount?: number;

  /** Maximum number of items */
  maxItemCount?: number;

  /** Equipment categories that qualify */
  equipmentCategories?: string[];

  /** Equipment conditions that qualify */
  equipmentConditions?: ('WORKING' | 'PARTIAL' | 'NOT_WORKING' | 'UNTESTED')[];

  // ---- Location criteria ----
  /** Must be within a scheduled route */
  withinScheduledRoute?: boolean;

  /** Maximum distance in miles */
  maxDistanceMiles?: number;

  /** Postcode prefixes that qualify */
  postcodeAreas?: string[];

  // ---- Value criteria ----
  /** Minimum estimated asset value in pence */
  minEstimatedValue?: number;

  /** Minimum expected recovery value in pence */
  minRecoveryValue?: number;

  // ---- Customer criteria ----
  /** Customer tiers that qualify */
  customerTiers?: string[];

  /** Whether an active contract is required */
  contractRequired?: boolean;
}

export interface FreeCollectionOutcome {
  /** Collection service is free */
  collectionFree: boolean;

  /** Transport is free */
  transportFree: boolean;

  /** Standard data erasure is free */
  standardErasureFree: boolean;

  /** Certified erasure is free (optional override) */
  certifiedErasureFree?: boolean;

  /** Physical destruction is free (optional override) */
  destructionFree?: boolean;

  /** Notes to display/record when this rule matches */
  notes?: string;
}

// ============================================
// REBATE SETTINGS
// ============================================

export interface RebateSettings {
  /** Whether rebates are enabled */
  enabled: boolean;

  /** Default rebate percentage of asset resale value */
  defaultRebatePercentage?: number;

  /** Minimum asset value (pence) before rebate applies */
  minimumRebateThreshold?: number;

  /** Minimum rebate amount (pence) to pay out */
  minimumPayoutAmount?: number;

  /** Payment terms (e.g., 'NET30', 'NET60') */
  rebatePaymentTerms?: string;

  /** Rebate calculation frequency */
  calculationFrequency?: 'PER_COLLECTION' | 'MONTHLY' | 'QUARTERLY';
}

// ============================================
// QUOTE REQUIREMENTS
// ============================================

export interface QuoteRequirements {
  /** Quote required for dedicated (non-route) collections */
  requireQuoteForDedicated: boolean;

  /** Quote required when items exceed this count */
  requireQuoteAboveItemCount?: number;

  /** Quote required when estimated value exceeds this (pence) */
  requireQuoteAboveValue?: number;

  /** Equipment categories that always require a quote */
  requireQuoteForCategories?: string[];

  /** Quote validity period in days */
  quoteValidityDays: number;

  /** Quote approval required before sending */
  requireApprovalBeforeSend: boolean;
}

// ============================================
// TAX SETTINGS
// ============================================

export interface TaxSettings {
  /** Default tax rate (e.g., 20 for 20% VAT) */
  defaultTaxRate: number;

  /** Whether organization is VAT/tax registered */
  taxRegistered: boolean;

  /** Tax registration number (VAT number) */
  taxRegistrationNumber?: string;

  /** Services exempt from tax */
  taxExemptServices?: ServiceType[];

  /** Whether to show tax-inclusive prices */
  showTaxInclusivePrices: boolean;
}

// ============================================
// CURRENCY SETTINGS
// ============================================

export interface CurrencySettings {
  /** Default currency code (ISO 4217) */
  defaultCurrency: string;

  /** Currency symbol for display */
  currencySymbol: string;

  /** Number of decimal places */
  decimalPlaces: number;

  /** Locale for formatting */
  locale: string;
}

// ============================================
// PRICING CALCULATION TYPES
// ============================================

/**
 * Result of calculating pricing for a collection
 */
export interface PricingCalculationResult {
  /** Whether the collection qualifies as free */
  isFree: boolean;

  /** Why it's free (rule ID or reason) */
  freeReason?: string;

  /** Chargeable status */
  chargeableStatus: ChargeableStatus;

  /** Whether a quote is required */
  quoteRequired: boolean;

  /** Itemized charges */
  charges: PricingLineItem[];

  /** Subtotal before tax in pence */
  subtotal: number;

  /** Tax amount in pence */
  taxAmount: number;

  /** Total including tax in pence */
  total: number;

  /** Any applicable discounts */
  discounts: PricingDiscount[];

  /** Currency code */
  currency: string;

  /** Pricing policy used */
  pricingPolicyId?: string;

  /** Contract applied (if any) */
  contractId?: string;
}

export interface PricingLineItem {
  /** Service type */
  serviceType: ServiceType;

  /** Description */
  description: string;

  /** Quantity */
  quantity: number;

  /** Unit of measure */
  unit?: string;

  /** Charge type applied */
  chargeType: ChargeType;

  /** Unit price in pence */
  unitPrice: number;

  /** Line total in pence */
  lineTotal: number;

  /** Tax rate percentage */
  taxRate: number;

  /** Tax amount in pence */
  taxAmount: number;

  /** Source of this pricing */
  source: 'POLICY' | 'CONTRACT' | 'QUOTE' | 'MANUAL';

  /** ID of the pricing source */
  sourceId?: string;
}

export interface PricingDiscount {
  /** Discount description */
  description: string;

  /** Discount type */
  type: 'PERCENTAGE' | 'FIXED';

  /** Discount value (percentage or pence) */
  value: number;

  /** Discount amount in pence */
  amount: number;

  /** Reason for discount */
  reason?: string;
}

// ============================================
// ELIGIBILITY EVALUATION TYPES
// ============================================

/**
 * Input for evaluating free collection eligibility
 */
export interface FreeEligibilityInput {
  /** Customer ID */
  customerId: string;

  /** Customer tier ID */
  tierId?: string;

  /** Active contract ID */
  contractId?: string;

  /** Site postcode */
  postcode: string;

  /** Whether booking against scheduled route */
  isScheduledRoute: boolean;

  /** Distance in miles (if known) */
  distanceMiles?: number;

  /** Equipment categories */
  equipmentCategories: string[];

  /** Estimated item count */
  itemCount: number;

  /** Estimated asset value in pence */
  estimatedValue?: number;

  /** Expected recovery value in pence */
  expectedRecoveryValue?: number;
}

/**
 * Result of evaluating free collection eligibility
 */
export interface FreeEligibilityResult {
  /** Whether the collection is eligible for free */
  eligible: boolean;

  /** Rules that matched */
  matchedRules: MatchedRule[];

  /** Services that are free */
  freeServices: {
    collection: boolean;
    transport: boolean;
    standardErasure: boolean;
    certifiedErasure: boolean;
    destruction: boolean;
  };

  /** Explanation for customer */
  customerMessage?: string;

  /** Internal notes */
  internalNotes?: string;
}

export interface MatchedRule {
  /** Rule ID */
  ruleId: string;

  /** Rule name */
  ruleName: string;

  /** Which conditions matched */
  matchedConditions: string[];
}

// ============================================
// COLLECTION COMMERCIAL EXTENSION TYPES
// ============================================

/**
 * Commercial data for a collection
 * Stored across Collection fields
 */
export interface CollectionCommercialData {
  /** Contract applied to this collection */
  contractId?: string;

  /** Pricing policy applied */
  pricingPolicyId?: string;

  /** Quote ID (if quoted) */
  quoteId?: string;

  /** Commercial classification */
  commercialType: CollectionCommercialType;

  /** Chargeable status */
  chargeableStatus: ChargeableStatus;

  /** Whether this is a free collection */
  isFree: boolean;

  /** Why it's free */
  freeReason?: string;

  /** Free eligibility rule that matched */
  freeRuleId?: string;

  /** Charge breakdown in pence */
  charges: {
    collection?: number;
    transport?: number;
    dataServices?: number;
    other?: number;
    subtotal?: number;
    discount?: number;
    taxRate?: number;
    tax?: number;
    total?: number;
  };

  /** Currency */
  currency: string;

  /** Asset value tracking */
  assetValue: {
    estimated?: number;
    actual?: number;
    rebatePercentage?: number;
    rebateAmount?: number;
  };

  /** Customer acceptance */
  acceptance?: {
    disclosedAt?: Date;
    acceptedAt?: Date;
    acceptedBy?: string;
    method?: 'PORTAL' | 'EMAIL' | 'PHONE' | 'IN_PERSON';
  };

  /** Invoice tracking */
  invoice?: {
    required: boolean;
    id?: string;
    status?: 'PENDING' | 'GENERATED' | 'SENT' | 'PAID' | 'CANCELLED';
  };
}

// ============================================
// PROFITABILITY TYPES
// ============================================

/**
 * Profitability calculation for a collection
 */
export interface CollectionProfitability {
  /** Collection ID */
  collectionId: string;

  /** Customer ID */
  customerId: string;

  /** Collection reference */
  reference: string;

  /** Revenue breakdown in pence */
  revenue: {
    serviceCharges: number;
    assetResale: number;
    scrapRecovery: number;
    otherRevenue: number;
    totalRevenue: number;
  };

  /** Cost breakdown in pence */
  costs: {
    transport: number;
    processing: number;
    dataServices: number;
    materials: number;
    overhead: number;
    totalCosts: number;
  };

  /** Customer payments in pence */
  customerPayments: {
    rebates: number;
    creditNotes: number;
    totalPayments: number;
  };

  /** Margin calculation in pence */
  margin: {
    grossMargin: number;
    netMargin: number;
    marginPercentage: number;
  };

  /** Whether all data is recorded */
  isComplete: boolean;

  /** Calculation timestamp */
  calculatedAt: Date;
}

// ============================================
// DEFAULT VALUES
// ============================================

/**
 * Default commercial settings for new organizations
 * Configured for free-first ITAD model
 */
export const DEFAULT_COMMERCIAL_SETTINGS: OrganizationCommercialSettings = {
  enabled: true,

  defaultCollectionPolicy: {
    defaultChargeType: 'CONDITIONAL',
    minimumCharge: 0,
  },

  defaultTransportPolicy: {
    scheduledRouteCharge: 'FREE',
    dedicatedCollectionCharge: 'QUOTED',
    freeRadiusMiles: 50,
  },

  defaultDataServicesPolicy: {
    standardErasure: 'FREE',
    certifiedErasure: 'PER_ITEM',
    physicalDestruction: 'PER_ITEM',
    certifiedErasureRate: 500, // £5.00 per item
    physicalDestructionRate: 300, // £3.00 per item
  },

  freeCollectionEligibility: {
    enabled: true,
    evaluationMode: 'ANY',
    rules: [
      {
        id: 'scheduled-route',
        name: 'Scheduled Route Collection',
        enabled: true,
        priority: 1,
        conditions: {
          withinScheduledRoute: true,
          minItemCount: 1,
        },
        outcome: {
          collectionFree: true,
          transportFree: true,
          standardErasureFree: true,
          notes: 'Free collection on scheduled route',
        },
      },
      {
        id: 'high-value',
        name: 'High Value Collection',
        enabled: true,
        priority: 2,
        conditions: {
          minEstimatedValue: 100000, // £1,000.00
        },
        outcome: {
          collectionFree: true,
          transportFree: true,
          standardErasureFree: true,
          notes: 'Free collection due to high asset value',
        },
      },
    ],
  },

  rebateSettings: {
    enabled: false,
    defaultRebatePercentage: 0,
    minimumRebateThreshold: 50000, // £500.00
    minimumPayoutAmount: 5000, // £50.00
    rebatePaymentTerms: 'NET30',
    calculationFrequency: 'MONTHLY',
  },

  quoteRequirements: {
    requireQuoteForDedicated: true,
    requireQuoteAboveItemCount: 500,
    quoteValidityDays: 30,
    requireApprovalBeforeSend: false,
  },

  taxSettings: {
    defaultTaxRate: 20,
    taxRegistered: true,
    showTaxInclusivePrices: false,
  },

  currencySettings: {
    defaultCurrency: 'GBP',
    currencySymbol: '£',
    decimalPlaces: 2,
    locale: 'en-GB',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format amount in pence to currency string
 */
export function formatCurrency(
  amountInPence: number,
  settings: CurrencySettings = DEFAULT_COMMERCIAL_SETTINGS.currencySettings
): string {
  const amount = amountInPence / 100;
  return new Intl.NumberFormat(settings.locale, {
    style: 'currency',
    currency: settings.defaultCurrency,
    minimumFractionDigits: settings.decimalPlaces,
    maximumFractionDigits: settings.decimalPlaces,
  }).format(amount);
}

/**
 * Convert pounds to pence
 */
export function toPence(pounds: number): number {
  return Math.round(pounds * 100);
}

/**
 * Convert pence to pounds
 */
export function toPounds(pence: number): number {
  return pence / 100;
}

/**
 * Calculate tax amount
 */
export function calculateTax(
  amountInPence: number,
  taxRate: number
): { taxAmount: number; totalWithTax: number } {
  const taxAmount = Math.round(amountInPence * (taxRate / 100));
  return {
    taxAmount,
    totalWithTax: amountInPence + taxAmount,
  };
}
