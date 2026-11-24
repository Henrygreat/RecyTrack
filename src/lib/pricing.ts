/**
 * RecyTrack Pricing Calculation Engine
 *
 * Core logic for calculating collection pricing, evaluating free eligibility,
 * and determining charges based on organization policies and customer contracts.
 */

import { prisma } from "@/lib/prisma";
import type {
  OrganizationCommercialSettings,
  FreeCollectionRule,
  FreeEligibilityInput,
  FreeEligibilityResult,
  PricingCalculationResult,
  PricingLineItem,
  MatchedRule,
  ChargeableStatus,
  ServiceType,
} from "./commercial-types";

// ============================================
// FREE ELIGIBILITY EVALUATION
// ============================================

/**
 * Evaluate whether a collection qualifies for free services
 */
export async function evaluateFreeEligibility(
  organizationId: string,
  input: FreeEligibilityInput
): Promise<FreeEligibilityResult> {
  // Get organization commercial settings
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  const settings = org?.settings as Record<string, unknown> | null;
  const { DEFAULT_COMMERCIAL_SETTINGS } = await import("./commercial-types");
  const commercial = (settings?.commercial as OrganizationCommercialSettings) || DEFAULT_COMMERCIAL_SETTINGS;

  const eligibility = commercial.freeCollectionEligibility;

  // If free eligibility is disabled, nothing is free by default policy
  if (!eligibility.enabled) {
    return {
      eligible: false,
      matchedRules: [],
      freeServices: {
        collection: false,
        transport: false,
        standardErasure: false,
        certifiedErasure: false,
        destruction: false,
      },
    };
  }

  // Check if customer has contract with free collection terms
  if (input.contractId) {
    const contract = await prisma.customerContract.findFirst({
      where: {
        id: input.contractId,
        organizationId,
        status: "CONTRACT_ACTIVE",
        freeCollectionEnabled: true,
      },
    });

    if (contract) {
      return {
        eligible: true,
        matchedRules: [
          {
            ruleId: "contract",
            ruleName: `Contract: ${contract.reference}`,
            matchedConditions: ["Active contract with free collection terms"],
          },
        ],
        freeServices: {
          collection: true,
          transport: true,
          standardErasure: true,
          certifiedErasure: false,
          destruction: false,
        },
        customerMessage: "Free collection under your contract terms",
        internalNotes: `Contract ${contract.reference} includes free collections`,
      };
    }
  }

  // Evaluate rules
  const matchedRules: MatchedRule[] = [];
  const sortedRules = [...eligibility.rules]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    const matchResult = evaluateRule(rule, input);
    if (matchResult.matches) {
      matchedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        matchedConditions: matchResult.conditions,
      });

      // In ANY mode, first match wins
      if (eligibility.evaluationMode === "ANY") {
        return {
          eligible: true,
          matchedRules,
          freeServices: {
            collection: rule.outcome.collectionFree,
            transport: rule.outcome.transportFree,
            standardErasure: rule.outcome.standardErasureFree,
            certifiedErasure: rule.outcome.certifiedErasureFree || false,
            destruction: rule.outcome.destructionFree || false,
          },
          customerMessage: rule.outcome.notes,
          internalNotes: `Matched rule: ${rule.name}`,
        };
      }
    }
  }

  // In ALL mode, all rules must match
  if (eligibility.evaluationMode === "ALL" && matchedRules.length === sortedRules.length && sortedRules.length > 0) {
    // Combine outcomes from all rules
    const freeServices = {
      collection: sortedRules.every((r) => r.outcome.collectionFree),
      transport: sortedRules.every((r) => r.outcome.transportFree),
      standardErasure: sortedRules.every((r) => r.outcome.standardErasureFree),
      certifiedErasure: sortedRules.every((r) => r.outcome.certifiedErasureFree || false),
      destruction: sortedRules.every((r) => r.outcome.destructionFree || false),
    };

    return {
      eligible: freeServices.collection || freeServices.transport,
      matchedRules,
      freeServices,
      internalNotes: `All ${matchedRules.length} rules matched`,
    };
  }

  // No rules matched or not all rules matched in ALL mode
  return {
    eligible: matchedRules.length > 0,
    matchedRules,
    freeServices: {
      collection: false,
      transport: false,
      standardErasure: false,
      certifiedErasure: false,
      destruction: false,
    },
  };
}

/**
 * Evaluate a single rule against input
 */
function evaluateRule(
  rule: FreeCollectionRule,
  input: FreeEligibilityInput
): { matches: boolean; conditions: string[] } {
  const matchedConditions: string[] = [];
  const conditions = rule.conditions;

  // Item count checks
  if (conditions.minItemCount !== undefined) {
    if (input.itemCount < conditions.minItemCount) {
      return { matches: false, conditions: [] };
    }
    matchedConditions.push(`Item count >= ${conditions.minItemCount}`);
  }

  if (conditions.maxItemCount !== undefined) {
    if (input.itemCount > conditions.maxItemCount) {
      return { matches: false, conditions: [] };
    }
    matchedConditions.push(`Item count <= ${conditions.maxItemCount}`);
  }

  // Equipment categories check
  if (conditions.equipmentCategories && conditions.equipmentCategories.length > 0) {
    const hasMatchingCategory = input.equipmentCategories.some((cat) =>
      conditions.equipmentCategories!.includes(cat)
    );
    if (!hasMatchingCategory) {
      return { matches: false, conditions: [] };
    }
    matchedConditions.push("Equipment category matches");
  }

  // Scheduled route check
  if (conditions.withinScheduledRoute !== undefined) {
    if (conditions.withinScheduledRoute && !input.isScheduledRoute) {
      return { matches: false, conditions: [] };
    }
    if (conditions.withinScheduledRoute) {
      matchedConditions.push("On scheduled route");
    }
  }

  // Distance check
  if (conditions.maxDistanceMiles !== undefined && input.distanceMiles !== undefined) {
    if (input.distanceMiles > conditions.maxDistanceMiles) {
      return { matches: false, conditions: [] };
    }
    matchedConditions.push(`Within ${conditions.maxDistanceMiles} miles`);
  }

  // Postcode area check
  if (conditions.postcodeAreas && conditions.postcodeAreas.length > 0) {
    const postcodePrefix = input.postcode.replace(/\s+/g, "").substring(0, 2).toUpperCase();
    if (!conditions.postcodeAreas.includes(postcodePrefix)) {
      return { matches: false, conditions: [] };
    }
    matchedConditions.push("Postcode area matches");
  }

  // Value checks
  if (conditions.minEstimatedValue !== undefined && input.estimatedValue !== undefined) {
    if (input.estimatedValue < conditions.minEstimatedValue) {
      return { matches: false, conditions: [] };
    }
    matchedConditions.push(`Estimated value >= £${(conditions.minEstimatedValue / 100).toFixed(2)}`);
  }

  if (conditions.minRecoveryValue !== undefined && input.expectedRecoveryValue !== undefined) {
    if (input.expectedRecoveryValue < conditions.minRecoveryValue) {
      return { matches: false, conditions: [] };
    }
    matchedConditions.push(`Recovery value >= £${(conditions.minRecoveryValue / 100).toFixed(2)}`);
  }

  // Customer tier check
  if (conditions.customerTiers && conditions.customerTiers.length > 0) {
    if (!input.tierId || !conditions.customerTiers.includes(input.tierId)) {
      return { matches: false, conditions: [] };
    }
    matchedConditions.push("Customer tier matches");
  }

  // Contract required check
  if (conditions.contractRequired) {
    if (!input.contractId) {
      return { matches: false, conditions: [] };
    }
    matchedConditions.push("Has active contract");
  }

  // All conditions passed
  return { matches: true, conditions: matchedConditions };
}

// ============================================
// PRICING CALCULATION
// ============================================

/**
 * Calculate pricing for a collection
 */
export async function calculateCollectionPricing(
  organizationId: string,
  input: {
    customerId: string;
    siteId?: string;
    isScheduledRoute: boolean;
    routeDateId?: string;
    equipmentCategories: string[];
    itemEstimate: number;
    estimatedValue?: number;
    distanceMiles?: number;
    postcode: string;
    requestedServices?: {
      certifiedErasure?: boolean;
      physicalDestruction?: boolean;
    };
  }
): Promise<PricingCalculationResult> {
  // Get customer with tier and active contract
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId },
    include: {
      tier: true,
      contracts: {
        where: {
          status: "CONTRACT_ACTIVE",
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } },
          ],
        },
        take: 1,
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!customer) {
    throw new Error("Customer not found");
  }

  const activeContract = customer.contracts[0];

  // Get organization commercial settings
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  const settings = org?.settings as Record<string, unknown> | null;
  const { DEFAULT_COMMERCIAL_SETTINGS, formatCurrency } = await import("./commercial-types");
  const commercial = (settings?.commercial as OrganizationCommercialSettings) || DEFAULT_COMMERCIAL_SETTINGS;

  // Evaluate free eligibility first
  const eligibilityInput: FreeEligibilityInput = {
    customerId: input.customerId,
    tierId: customer.tierId || undefined,
    contractId: activeContract?.id,
    postcode: input.postcode,
    isScheduledRoute: input.isScheduledRoute,
    distanceMiles: input.distanceMiles,
    equipmentCategories: input.equipmentCategories,
    itemCount: input.itemEstimate,
    estimatedValue: input.estimatedValue,
  };

  const eligibility = await evaluateFreeEligibility(organizationId, eligibilityInput);

  // If everything is free, return early
  if (
    eligibility.eligible &&
    eligibility.freeServices.collection &&
    eligibility.freeServices.transport &&
    eligibility.freeServices.standardErasure
  ) {
    return {
      isFree: true,
      freeReason: eligibility.matchedRules[0]?.ruleName || "Free collection policy",
      chargeableStatus: "CHARGEABLE_FREE",
      quoteRequired: false,
      charges: [],
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      discounts: [],
      currency: commercial.currencySettings?.defaultCurrency || "GBP",
      contractId: activeContract?.id,
    };
  }

  // Calculate charges for non-free services
  const charges: PricingLineItem[] = [];
  const taxRate = commercial.taxSettings?.defaultTaxRate || 0;

  // Collection charge
  if (!eligibility.freeServices.collection) {
    const collectionCharge = calculateServiceCharge(
      "COLLECTION",
      commercial.defaultCollectionPolicy,
      input.itemEstimate,
      input.distanceMiles
    );

    if (collectionCharge.quoteRequired) {
      return {
        isFree: false,
        chargeableStatus: "CHARGEABLE_QUOTED",
        quoteRequired: true,
        charges: [],
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        discounts: [],
        currency: commercial.currencySettings?.defaultCurrency || "GBP",
        contractId: activeContract?.id,
      };
    }

    if (collectionCharge.amount > 0) {
      const taxAmount = Math.round(collectionCharge.amount * (taxRate / 100));
      charges.push({
        serviceType: "COLLECTION" as ServiceType,
        description: "Collection Service",
        quantity: 1,
        chargeType: collectionCharge.chargeType as PricingLineItem["chargeType"],
        unitPrice: collectionCharge.amount,
        lineTotal: collectionCharge.amount,
        taxRate,
        taxAmount,
        source: "POLICY",
      });
    }
  }

  // Transport charge
  if (!eligibility.freeServices.transport) {
    const transportPolicy = commercial.defaultTransportPolicy;
    const isScheduled = input.isScheduledRoute;

    let transportCharge = 0;
    let transportChargeType = "FREE";

    if (isScheduled) {
      if (transportPolicy.scheduledRouteCharge === "FIXED" && transportPolicy.fixedRouteCharge) {
        transportCharge = transportPolicy.fixedRouteCharge;
        transportChargeType = "FIXED";
      } else if (transportPolicy.scheduledRouteCharge === "DISTANCE" && input.distanceMiles) {
        const freeRadius = transportPolicy.freeRadiusMiles || 0;
        const chargeableMiles = Math.max(0, input.distanceMiles - freeRadius);
        transportCharge = chargeableMiles * (transportPolicy.perMileRate || 0);
        transportChargeType = "PER_DISTANCE";
      }
    } else {
      // Dedicated collection
      if (transportPolicy.dedicatedCollectionCharge === "QUOTED") {
        return {
          isFree: false,
          chargeableStatus: "CHARGEABLE_QUOTED",
          quoteRequired: true,
          charges,
          subtotal: 0,
          taxAmount: 0,
          total: 0,
          discounts: [],
          currency: commercial.currencySettings?.defaultCurrency || "GBP",
          contractId: activeContract?.id,
        };
      } else if (transportPolicy.dedicatedCollectionCharge === "FIXED") {
        transportCharge = transportPolicy.dedicatedBaseCharge || 0;
        transportChargeType = "FIXED";
      } else if (transportPolicy.dedicatedCollectionCharge === "DISTANCE" && input.distanceMiles) {
        transportCharge = (transportPolicy.dedicatedBaseCharge || 0) +
          (input.distanceMiles * (transportPolicy.perMileRate || 0));
        transportChargeType = "PER_DISTANCE";
      }
    }

    if (transportCharge > 0) {
      const taxAmount = Math.round(transportCharge * (taxRate / 100));
      charges.push({
        serviceType: (isScheduled ? "TRANSPORT_SCHEDULED" : "TRANSPORT_DEDICATED") as ServiceType,
        description: isScheduled ? "Scheduled Route Transport" : "Dedicated Transport",
        quantity: 1,
        chargeType: transportChargeType as PricingLineItem["chargeType"],
        unitPrice: transportCharge,
        lineTotal: transportCharge,
        taxRate,
        taxAmount,
        source: "POLICY",
      });
    }
  }

  // Data services charges
  const dataServicesPolicy = commercial.defaultDataServicesPolicy;

  // Standard erasure (included by default if not free)
  if (!eligibility.freeServices.standardErasure && input.itemEstimate > 0) {
    if (dataServicesPolicy.standardErasure === "PER_ITEM" && dataServicesPolicy.standardErasureRate) {
      const erasureCharge = input.itemEstimate * dataServicesPolicy.standardErasureRate;
      const taxAmount = Math.round(erasureCharge * (taxRate / 100));
      charges.push({
        serviceType: "DATA_ERASURE_STANDARD" as ServiceType,
        description: "Standard Data Erasure",
        quantity: input.itemEstimate,
        unit: "items",
        chargeType: "PER_ITEM",
        unitPrice: dataServicesPolicy.standardErasureRate,
        lineTotal: erasureCharge,
        taxRate,
        taxAmount,
        source: "POLICY",
      });
    }
  }

  // Certified erasure (if requested)
  if (input.requestedServices?.certifiedErasure && !eligibility.freeServices.certifiedErasure) {
    if (dataServicesPolicy.certifiedErasure === "PER_ITEM" && dataServicesPolicy.certifiedErasureRate) {
      const certErasureCharge = input.itemEstimate * dataServicesPolicy.certifiedErasureRate;
      const taxAmount = Math.round(certErasureCharge * (taxRate / 100));
      charges.push({
        serviceType: "DATA_ERASURE_CERTIFIED" as ServiceType,
        description: "Certified Data Erasure",
        quantity: input.itemEstimate,
        unit: "items",
        chargeType: "PER_ITEM",
        unitPrice: dataServicesPolicy.certifiedErasureRate,
        lineTotal: certErasureCharge,
        taxRate,
        taxAmount,
        source: "POLICY",
      });
    } else if (dataServicesPolicy.certifiedErasure === "QUOTED") {
      return {
        isFree: false,
        chargeableStatus: "CHARGEABLE_QUOTED",
        quoteRequired: true,
        charges,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        discounts: [],
        currency: commercial.currencySettings?.defaultCurrency || "GBP",
        contractId: activeContract?.id,
      };
    }
  }

  // Physical destruction (if requested)
  if (input.requestedServices?.physicalDestruction && !eligibility.freeServices.destruction) {
    if (dataServicesPolicy.physicalDestruction === "PER_ITEM" && dataServicesPolicy.physicalDestructionRate) {
      const destructionCharge = input.itemEstimate * dataServicesPolicy.physicalDestructionRate;
      const taxAmount = Math.round(destructionCharge * (taxRate / 100));
      charges.push({
        serviceType: "PHYSICAL_DESTRUCTION" as ServiceType,
        description: "Physical Media Destruction",
        quantity: input.itemEstimate,
        unit: "items",
        chargeType: "PER_ITEM",
        unitPrice: dataServicesPolicy.physicalDestructionRate,
        lineTotal: destructionCharge,
        taxRate,
        taxAmount,
        source: "POLICY",
      });
    } else if (dataServicesPolicy.physicalDestruction === "QUOTED") {
      return {
        isFree: false,
        chargeableStatus: "CHARGEABLE_QUOTED",
        quoteRequired: true,
        charges,
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        discounts: [],
        currency: commercial.currencySettings?.defaultCurrency || "GBP",
        contractId: activeContract?.id,
      };
    }
  }

  // Calculate totals
  const subtotal = charges.reduce((sum, c) => sum + c.lineTotal, 0);
  const totalTax = charges.reduce((sum, c) => sum + c.taxAmount, 0);
  const total = subtotal + totalTax;

  // Determine chargeable status
  const chargeableStatus: ChargeableStatus =
    charges.length === 0 ? "CHARGEABLE_FREE" :
    eligibility.matchedRules.length > 0 ? "CHARGEABLE_CONDITIONAL" :
    "CHARGEABLE_YES";

  return {
    isFree: charges.length === 0,
    freeReason: charges.length === 0 ? (eligibility.matchedRules[0]?.ruleName || "Free collection policy") : undefined,
    chargeableStatus,
    quoteRequired: false,
    charges,
    subtotal,
    taxAmount: totalTax,
    total,
    discounts: [],
    currency: commercial.currencySettings?.defaultCurrency || "GBP",
    contractId: activeContract?.id,
  };
}

/**
 * Calculate charge for a specific service based on policy
 */
function calculateServiceCharge(
  serviceType: string,
  policy: { defaultChargeType: string; fixedCharge?: number; minimumCharge?: number },
  quantity: number,
  distance?: number
): { amount: number; chargeType: string; quoteRequired: boolean } {
  switch (policy.defaultChargeType) {
    case "FREE":
      return { amount: 0, chargeType: "FREE", quoteRequired: false };

    case "FIXED":
      return {
        amount: policy.fixedCharge || 0,
        chargeType: "FIXED",
        quoteRequired: false,
      };

    case "QUOTED":
      return { amount: 0, chargeType: "QUOTE_REQUIRED", quoteRequired: true };

    case "CONDITIONAL":
      // For conditional, we return 0 and let the eligibility check determine if it's actually free
      return { amount: 0, chargeType: "CONDITIONAL_FREE", quoteRequired: false };

    default:
      return { amount: 0, chargeType: "FREE", quoteRequired: false };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a quote is required for given parameters
 */
export async function isQuoteRequired(
  organizationId: string,
  input: {
    isScheduledRoute: boolean;
    itemEstimate: number;
    equipmentCategories: string[];
    estimatedValue?: number;
  }
): Promise<{ required: boolean; reason?: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  const settings = org?.settings as Record<string, unknown> | null;
  const { DEFAULT_COMMERCIAL_SETTINGS } = await import("./commercial-types");
  const commercial = (settings?.commercial as OrganizationCommercialSettings) || DEFAULT_COMMERCIAL_SETTINGS;
  const quoteReqs = commercial.quoteRequirements;

  // Dedicated collection
  if (!input.isScheduledRoute && quoteReqs.requireQuoteForDedicated) {
    return { required: true, reason: "Quote required for dedicated collections" };
  }

  // Item count threshold
  if (quoteReqs.requireQuoteAboveItemCount && input.itemEstimate > quoteReqs.requireQuoteAboveItemCount) {
    return { required: true, reason: `Quote required for collections over ${quoteReqs.requireQuoteAboveItemCount} items` };
  }

  // Value threshold
  if (quoteReqs.requireQuoteAboveValue && input.estimatedValue && input.estimatedValue > quoteReqs.requireQuoteAboveValue) {
    return { required: true, reason: "Quote required for high-value collections" };
  }

  // Category check
  if (quoteReqs.requireQuoteForCategories && quoteReqs.requireQuoteForCategories.length > 0) {
    const requiresQuote = input.equipmentCategories.some((cat) =>
      quoteReqs.requireQuoteForCategories!.includes(cat)
    );
    if (requiresQuote) {
      return { required: true, reason: "Quote required for selected equipment categories" };
    }
  }

  return { required: false };
}

/**
 * Get applicable pricing policy for a customer
 */
export async function getApplicablePricingPolicy(
  organizationId: string,
  customerId: string
): Promise<{
  policyId: string | null;
  source: "CONTRACT" | "TIER" | "DEFAULT" | "NONE";
  contractId?: string;
}> {
  // Check for active contract with pricing policy
  const contract = await prisma.customerContract.findFirst({
    where: {
      organizationId,
      customerId,
      status: "CONTRACT_ACTIVE",
      pricingPolicyId: { not: null },
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } },
      ],
    },
    select: { id: true, pricingPolicyId: true },
  });

  if (contract?.pricingPolicyId) {
    return { policyId: contract.pricingPolicyId, source: "CONTRACT", contractId: contract.id };
  }

  // Check customer tier
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
    include: { tier: { select: { pricingPolicyId: true } } },
  });

  if (customer?.tier?.pricingPolicyId) {
    return { policyId: customer.tier.pricingPolicyId, source: "TIER" };
  }

  // Get organization default policy
  const defaultPolicy = await prisma.pricingPolicy.findFirst({
    where: { organizationId, isDefault: true, isActive: true },
    select: { id: true },
  });

  if (defaultPolicy) {
    return { policyId: defaultPolicy.id, source: "DEFAULT" };
  }

  return { policyId: null, source: "NONE" };
}
