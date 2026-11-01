/**
 * Certificate Eligibility Engine
 *
 * Server-side service to verify certificate eligibility before issuance.
 * Never allows client-side form values to bypass eligibility checks.
 */

import { prisma } from "@/lib/prisma";
import type {
  CertificateType,
  MediaSanitisationStatus,
  ErasureJobStatus,
  DestructionStatus,
} from "@prisma/client";

export type EligibilityCheckResult = {
  eligible: boolean;
  errors: string[];
  warnings: string[];
  details: {
    storageMediaId: string;
    mediaReference: string;
    serialNumber: string | null;
    assetTag: string;
    customerId: string | null;
    customerName: string | null;
    processingType: "ERASURE" | "DESTRUCTION" | null;
    processingMethod: string | null;
    processingDate: Date | null;
    verifiedAt: Date | null;
    verifiedByName: string | null;
    hasEvidence: boolean;
    evidenceCount: number;
  };
};

export type BatchEligibilityResult = {
  allEligible: boolean;
  eligibleCount: number;
  ineligibleCount: number;
  customerId: string | null;
  customerName: string | null;
  certificateType: CertificateType;
  items: EligibilityCheckResult[];
  globalErrors: string[];
};

/**
 * Check if a single storage media item is eligible for certification
 */
export async function checkMediaEligibility(
  organizationId: string,
  storageMediaId: string
): Promise<EligibilityCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Fetch the storage media with all related data
  const media = await prisma.storageMedia.findFirst({
    where: { id: storageMediaId, organizationId },
    include: {
      asset: {
        include: {
          customer: {
            select: { id: true, name: true, status: true },
          },
        },
      },
      erasureJobs: {
        where: {
          status: { in: ["VERIFIED", "PASSED"] },
        },
        include: {
          evidence: true,
        },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
      destructionJob: {
        include: {
          witnesses: true,
          evidence: true,
        },
      },
      certificateItems: {
        include: {
          certificate: {
            select: { id: true, status: true, reference: true },
          },
        },
      },
    },
  });

  if (!media) {
    return {
      eligible: false,
      errors: ["Storage media not found or does not belong to this organization"],
      warnings: [],
      details: {
        storageMediaId,
        mediaReference: "",
        serialNumber: null,
        assetTag: "",
        customerId: null,
        customerName: null,
        processingType: null,
        processingMethod: null,
        processingDate: null,
        verifiedAt: null,
        verifiedByName: null,
        hasEvidence: false,
        evidenceCount: 0,
      },
    };
  }

  // Check for existing active certificate
  const existingActiveCert = media.certificateItems.find(
    (item) => item.certificate.status === "ISSUED"
  );
  if (existingActiveCert) {
    errors.push(
      `Media already has an active certificate: ${existingActiveCert.certificate.reference}`
    );
  }

  // Check customer is valid
  if (!media.asset.customer) {
    errors.push("Media is not linked to a customer");
  } else if (media.asset.customer.status !== "ACTIVE") {
    errors.push("Customer account is not active");
  }

  // Determine processing type and check status
  let processingType: "ERASURE" | "DESTRUCTION" | null = null;
  let processingMethod: string | null = null;
  let processingDate: Date | null = null;
  let verifiedAt: Date | null = null;
  let verifiedByName: string | null = null;
  let hasEvidence = false;
  let evidenceCount = 0;

  // Check destruction first (takes precedence over erasure)
  if (media.destructionJob) {
    const destruction = media.destructionJob;
    processingType = "DESTRUCTION";
    processingMethod = destruction.destructionMethod;

    if (destruction.status !== "VERIFIED") {
      errors.push(
        `Destruction job status is '${destruction.status}' - must be VERIFIED`
      );
    } else {
      processingDate = destruction.completedAt;
      verifiedAt = destruction.verifiedAt;
      verifiedByName = destruction.verifiedByName;
    }

    // Check witness requirements
    if (destruction.requiresWitness) {
      const confirmedWitnesses = destruction.witnesses.filter((w) => w.confirmedAt);
      if (confirmedWitnesses.length < destruction.witnessCount) {
        errors.push(
          `Destruction requires ${destruction.witnessCount} witness(es) but only ${confirmedWitnesses.length} confirmed`
        );
      }
    }

    // Check evidence
    evidenceCount = destruction.evidence.length;
    hasEvidence = evidenceCount > 0;
    if (!hasEvidence) {
      warnings.push("No evidence attached to destruction job");
    }
  } else if (media.erasureJobs.length > 0) {
    const erasure = media.erasureJobs[0];
    processingType = "ERASURE";
    processingMethod = erasure.methodName;

    if (erasure.status !== "VERIFIED") {
      errors.push(
        `Erasure job status is '${erasure.status}' - must be VERIFIED`
      );
    } else {
      processingDate = erasure.completedAt;
      verifiedAt = erasure.supervisorApprovedAt || erasure.verifiedAt;
      verifiedByName = erasure.supervisorApprovedByName || erasure.verifiedByName;
    }

    // Check supervisor approval if required
    if (erasure.supervisorApprovalRequired && !erasure.supervisorApprovedAt) {
      errors.push("Erasure requires supervisor approval which has not been completed");
    }

    // Check evidence
    evidenceCount = erasure.evidence.length;
    hasEvidence = evidenceCount > 0;
    if (!hasEvidence) {
      warnings.push("No evidence attached to erasure job");
    }
  } else {
    // Check sanitisation status
    const validStatuses: MediaSanitisationStatus[] = ["VERIFIED"];
    if (!validStatuses.includes(media.sanitisationStatus)) {
      errors.push(
        `Media sanitisation status is '${media.sanitisationStatus}' - no completed and verified processing found`
      );
    }
  }

  // Check for blocking compliance exceptions
  const blockingExceptions = await prisma.complianceException.findMany({
    where: {
      organizationId,
      storageMediaId,
      isBlocking: true,
      status: { in: ["OPEN", "INVESTIGATING", "PENDING_ACTION"] },
    },
  });

  if (blockingExceptions.length > 0) {
    errors.push(
      `${blockingExceptions.length} blocking compliance exception(s) must be resolved`
    );
  }

  return {
    eligible: errors.length === 0,
    errors,
    warnings,
    details: {
      storageMediaId: media.id,
      mediaReference: media.reference,
      serialNumber: media.serialNumber,
      assetTag: media.asset.assetTag,
      customerId: media.asset.customer?.id || null,
      customerName: media.asset.customer?.name || null,
      processingType,
      processingMethod,
      processingDate,
      verifiedAt,
      verifiedByName,
      hasEvidence,
      evidenceCount,
    },
  };
}

/**
 * Check eligibility for batch certificate
 */
export async function checkBatchEligibility(
  organizationId: string,
  storageMediaIds: string[]
): Promise<BatchEligibilityResult> {
  const globalErrors: string[] = [];
  const items: EligibilityCheckResult[] = [];

  if (storageMediaIds.length === 0) {
    return {
      allEligible: false,
      eligibleCount: 0,
      ineligibleCount: 0,
      customerId: null,
      customerName: null,
      certificateType: "BATCH",
      items: [],
      globalErrors: ["No storage media items provided"],
    };
  }

  // Check each media item
  for (const mediaId of storageMediaIds) {
    const result = await checkMediaEligibility(organizationId, mediaId);
    items.push(result);
  }

  // Verify all items belong to the same customer
  const customerIds = new Set(
    items
      .filter((item) => item.details.customerId)
      .map((item) => item.details.customerId)
  );

  if (customerIds.size === 0) {
    globalErrors.push("No items are linked to a customer");
  } else if (customerIds.size > 1) {
    globalErrors.push("All items in a batch certificate must belong to the same customer");
  }

  // Determine certificate type
  const processingTypes = new Set(
    items
      .filter((item) => item.details.processingType)
      .map((item) => item.details.processingType)
  );

  let certificateType: CertificateType = "BATCH";
  if (processingTypes.size === 1) {
    const type = Array.from(processingTypes)[0];
    if (type === "ERASURE") {
      certificateType = storageMediaIds.length === 1 ? "DATA_ERASURE" : "BATCH";
    } else if (type === "DESTRUCTION") {
      certificateType = storageMediaIds.length === 1 ? "PHYSICAL_DESTRUCTION" : "BATCH";
    }
  }

  const eligibleCount = items.filter((item) => item.eligible).length;
  const ineligibleCount = items.filter((item) => !item.eligible).length;

  // Get customer info from first eligible item
  const firstCustomer = items.find((item) => item.details.customerId);

  return {
    allEligible: ineligibleCount === 0 && globalErrors.length === 0,
    eligibleCount,
    ineligibleCount,
    customerId: firstCustomer?.details.customerId || null,
    customerName: firstCustomer?.details.customerName || null,
    certificateType,
    items,
    globalErrors,
  };
}

/**
 * Check if a whole asset is eligible for certification
 * (verifies all data-bearing components are sanitised)
 */
export async function checkAssetEligibility(
  organizationId: string,
  assetId: string
): Promise<BatchEligibilityResult> {
  // Get all data-bearing storage media for this asset
  const mediaList = await prisma.storageMedia.findMany({
    where: {
      organizationId,
      assetId,
      isDataBearing: true,
    },
    select: { id: true },
  });

  if (mediaList.length === 0) {
    return {
      allEligible: false,
      eligibleCount: 0,
      ineligibleCount: 0,
      customerId: null,
      customerName: null,
      certificateType: "BATCH",
      items: [],
      globalErrors: ["Asset has no data-bearing storage media registered"],
    };
  }

  return checkBatchEligibility(
    organizationId,
    mediaList.map((m) => m.id)
  );
}

/**
 * Final eligibility check before certificate creation
 * Called within a transaction to prevent race conditions
 */
export async function validateCertificateCreation(
  organizationId: string,
  storageMediaIds: string[],
  certificateType: CertificateType
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Check for concurrent certificate creation
  for (const mediaId of storageMediaIds) {
    const existingPending = await prisma.certificate.findFirst({
      where: {
        organizationId,
        status: { in: ["DRAFT", "PENDING_APPROVAL"] },
        items: {
          some: { storageMediaId: mediaId },
        },
      },
    });

    if (existingPending) {
      errors.push(
        `Media item is already included in a pending certificate: ${existingPending.reference}`
      );
    }

    // Check for active certificate
    const existingActive = await prisma.certificate.findFirst({
      where: {
        organizationId,
        status: "ISSUED",
        items: {
          some: { storageMediaId: mediaId },
        },
      },
    });

    if (existingActive) {
      errors.push(
        `Media item already has an active certificate: ${existingActive.reference}`
      );
    }
  }

  // Validate certificate type matches processing
  const eligibility = await checkBatchEligibility(organizationId, storageMediaIds);

  if (certificateType === "DATA_ERASURE") {
    const hasDestruction = eligibility.items.some(
      (item) => item.details.processingType === "DESTRUCTION"
    );
    if (hasDestruction) {
      errors.push(
        "Cannot issue Data Erasure certificate for physically destroyed media"
      );
    }
  }

  if (certificateType === "PHYSICAL_DESTRUCTION") {
    const hasErasure = eligibility.items.some(
      (item) => item.details.processingType === "ERASURE"
    );
    if (hasErasure) {
      errors.push(
        "Cannot issue Physical Destruction certificate for erased media"
      );
    }
  }

  return {
    valid: errors.length === 0 && eligibility.allEligible,
    errors: [...errors, ...eligibility.globalErrors],
  };
}
