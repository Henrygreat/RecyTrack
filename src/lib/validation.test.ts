import { describe, it, expect } from "vitest";
import {
  inspectionSchema,
  inspectionTypeEnum,
  conditionGradeEnum,
  inspectionTemplateSchema,
  quarantineSchema,
  quarantineReasonEnum,
  quarantineReleaseSchema,
  custodyEventSchema,
  custodyEventTypeEnum,
  handoverStatusEnum,
  custodyExceptionSchema,
  custodyExceptionTypeEnum,
} from "./validation";

// ============================================
// INSPECTION VALIDATION TESTS
// ============================================

describe("inspectionTypeEnum", () => {
  it("should accept valid inspection types", () => {
    const validTypes = [
      "RECEIVING",
      "PERIODIC",
      "PRE_SALE",
      "RANDOM",
      "QUALITY_CONTROL",
      "CUSTOMER_REQUEST",
      "POST_REPAIR",
    ];

    validTypes.forEach((type) => {
      const result = inspectionTypeEnum.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid inspection types", () => {
    const result = inspectionTypeEnum.safeParse("INVALID_TYPE");
    expect(result.success).toBe(false);
  });
});

describe("conditionGradeEnum", () => {
  it("should accept valid grades A-F", () => {
    const validGrades = ["A", "B", "C", "D", "F"];

    validGrades.forEach((grade) => {
      const result = conditionGradeEnum.safeParse(grade);
      expect(result.success).toBe(true);
    });
  });

  it("should reject grade E (not in the schema)", () => {
    const result = conditionGradeEnum.safeParse("E");
    expect(result.success).toBe(false);
  });

  it("should reject lowercase grades", () => {
    const result = conditionGradeEnum.safeParse("a");
    expect(result.success).toBe(false);
  });
});

describe("inspectionSchema", () => {
  it("should accept valid inspection data", () => {
    const validInspection = {
      assetId: "asset-123",
      inspectionType: "RECEIVING",
      conditionGrade: "B",
      gradeRationale: "Minor wear but fully functional",
      findings: "Screen has minor scratches",
      recommendedAction: "Proceed to data erasure",
      inspectorComments: "Unit in good condition overall",
    };

    const result = inspectionSchema.safeParse(validInspection);
    expect(result.success).toBe(true);
  });

  it("should require assetId", () => {
    const invalidInspection = {
      inspectionType: "RECEIVING",
    };

    const result = inspectionSchema.safeParse(invalidInspection);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("assetId");
    }
  });

  it("should accept optional templateId", () => {
    const inspection = {
      assetId: "asset-123",
      templateId: "template-456",
    };

    const result = inspectionSchema.safeParse(inspection);
    expect(result.success).toBe(true);
  });

  it("should default inspectionType to RECEIVING", () => {
    const inspection = {
      assetId: "asset-123",
    };

    const result = inspectionSchema.safeParse(inspection);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inspectionType).toBe("RECEIVING");
    }
  });

  it("should enforce maximum length on gradeRationale", () => {
    const inspection = {
      assetId: "asset-123",
      gradeRationale: "x".repeat(1001), // exceeds 1000 char limit
    };

    const result = inspectionSchema.safeParse(inspection);
    expect(result.success).toBe(false);
  });
});

describe("inspectionTemplateSchema", () => {
  it("should accept valid template data", () => {
    const validTemplate = {
      name: "Laptop Inspection Checklist",
      description: "Standard checklist for laptop inspections",
      category: "LAPTOP",
    };

    const result = inspectionTemplateSchema.safeParse(validTemplate);
    expect(result.success).toBe(true);
  });

  it("should require name", () => {
    const invalidTemplate = {
      category: "LAPTOP",
    };

    const result = inspectionTemplateSchema.safeParse(invalidTemplate);
    expect(result.success).toBe(false);
  });

  it("should require category", () => {
    const invalidTemplate = {
      name: "Test Template",
    };

    const result = inspectionTemplateSchema.safeParse(invalidTemplate);
    expect(result.success).toBe(false);
  });
});

// ============================================
// QUARANTINE VALIDATION TESTS
// ============================================

describe("quarantineReasonEnum", () => {
  it("should accept all valid quarantine reasons", () => {
    const validReasons = [
      "DAMAGE",
      "DATA_SECURITY",
      "INVESTIGATION",
      "COMPLIANCE",
      "CUSTOMER_REQUEST",
      "SUSPECTED_STOLEN",
      "HAZARDOUS",
      "OTHER",
    ];

    validReasons.forEach((reason) => {
      const result = quarantineReasonEnum.safeParse(reason);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid reasons", () => {
    const result = quarantineReasonEnum.safeParse("INVALID_REASON");
    expect(result.success).toBe(false);
  });
});

describe("quarantineSchema", () => {
  it("should accept valid quarantine data", () => {
    const validQuarantine = {
      assetId: "asset-123",
      reason: "DATA_SECURITY",
      description: "Found unwiped customer data",
      expectedEndDate: "2024-12-31",
      quarantineLocationId: "loc-456",
    };

    const result = quarantineSchema.safeParse(validQuarantine);
    expect(result.success).toBe(true);
  });

  it("should require assetId", () => {
    const invalidQuarantine = {
      reason: "DATA_SECURITY",
    };

    const result = quarantineSchema.safeParse(invalidQuarantine);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("assetId");
    }
  });

  it("should require reason", () => {
    const invalidQuarantine = {
      assetId: "asset-123",
    };

    const result = quarantineSchema.safeParse(invalidQuarantine);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("reason");
    }
  });

  it("should accept optional fields as empty strings", () => {
    const quarantine = {
      assetId: "asset-123",
      reason: "COMPLIANCE",
      description: "",
      expectedEndDate: "",
      quarantineLocationId: "",
    };

    const result = quarantineSchema.safeParse(quarantine);
    expect(result.success).toBe(true);
  });
});

describe("quarantineReleaseSchema", () => {
  it("should accept valid release data", () => {
    const validRelease = {
      quarantineId: "quarantine-123",
      resolutionAction: "Issue resolved, data wiped successfully",
      resolutionNotes: "Verified data erasure with certificate",
    };

    const result = quarantineReleaseSchema.safeParse(validRelease);
    expect(result.success).toBe(true);
  });

  it("should require quarantineId", () => {
    const invalidRelease = {
      resolutionAction: "Issue resolved",
    };

    const result = quarantineReleaseSchema.safeParse(invalidRelease);
    expect(result.success).toBe(false);
  });

  it("should require resolutionAction", () => {
    const invalidRelease = {
      quarantineId: "quarantine-123",
    };

    const result = quarantineReleaseSchema.safeParse(invalidRelease);
    expect(result.success).toBe(false);
  });
});

// ============================================
// CUSTODY VALIDATION TESTS
// ============================================

describe("custodyEventTypeEnum", () => {
  it("should accept all valid custody event types", () => {
    const validTypes = [
      "COLLECTION",
      "VEHICLE_LOADING",
      "VEHICLE_UNLOADING",
      "WAREHOUSE_RECEIPT",
      "INTERNAL_TRANSFER",
      "INSPECTION_HANDOVER",
      "QUARANTINE_TRANSFER",
      "PROCESSING_HANDOVER",
      "EXTERNAL_DISPATCH",
      "FINAL_HANDOVER",
    ];

    validTypes.forEach((type) => {
      const result = custodyEventTypeEnum.safeParse(type);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid event types", () => {
    const result = custodyEventTypeEnum.safeParse("INVALID_EVENT");
    expect(result.success).toBe(false);
  });
});

describe("handoverStatusEnum", () => {
  it("should accept all valid handover statuses", () => {
    const validStatuses = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED"];

    validStatuses.forEach((status) => {
      const result = handoverStatusEnum.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid statuses", () => {
    const result = handoverStatusEnum.safeParse("APPROVED");
    expect(result.success).toBe(false);
  });
});

describe("custodyEventSchema", () => {
  it("should accept valid custody event data", () => {
    const validEvent = {
      assetId: "asset-123",
      eventType: "INTERNAL_TRANSFER",
      toCustodianUserId: "user-456",
      toCustodianName: "John Smith",
      toCustodianType: "STAFF",
      toLocationId: "loc-789",
      toLocationName: "Warehouse A",
      notes: "Standard transfer for processing",
    };

    const result = custodyEventSchema.safeParse(validEvent);
    expect(result.success).toBe(true);
  });

  it("should require assetId", () => {
    const invalidEvent = {
      eventType: "COLLECTION",
    };

    const result = custodyEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("assetId");
    }
  });

  it("should require eventType", () => {
    const invalidEvent = {
      assetId: "asset-123",
    };

    const result = custodyEventSchema.safeParse(invalidEvent);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("eventType");
    }
  });

  it("should accept minimal event with just assetId and eventType", () => {
    const minimalEvent = {
      assetId: "asset-123",
      eventType: "COLLECTION",
    };

    const result = custodyEventSchema.safeParse(minimalEvent);
    expect(result.success).toBe(true);
  });
});

// ============================================
// CUSTODY EXCEPTION VALIDATION TESTS
// ============================================

describe("custodyExceptionTypeEnum", () => {
  it("should accept all valid exception types", () => {
    const validTypes = [
      "MISSING_CUSTODIAN",
      "UNCONFIRMED_HANDOVER",
      "UNEXPECTED_LOCATION",
      "MISSING_RECEIPT",
      "UNAUTHORIZED_TRANSFER",
      "CUSTODY_DISCREPANCY",
      "ASSET_NOT_FOUND",
    ];

    validTypes.forEach((type) => {
      const result = custodyExceptionTypeEnum.safeParse(type);
      expect(result.success).toBe(true);
    });
  });
});

describe("custodyExceptionSchema", () => {
  it("should accept valid exception data", () => {
    const validException = {
      assetId: "asset-123",
      exceptionType: "CUSTODY_DISCREPANCY",
      description: "Asset found in unexpected location",
      expectedValue: "Warehouse A, Bay 3",
      actualValue: "Warehouse B, Bay 7",
      priority: "high",
    };

    const result = custodyExceptionSchema.safeParse(validException);
    expect(result.success).toBe(true);
  });

  it("should require description", () => {
    const invalidException = {
      assetId: "asset-123",
      exceptionType: "CUSTODY_DISCREPANCY",
      priority: "medium",
    };

    const result = custodyExceptionSchema.safeParse(invalidException);
    expect(result.success).toBe(false);
  });

  it("should default priority to medium", () => {
    const exception = {
      assetId: "asset-123",
      exceptionType: "MISSING_RECEIPT",
      description: "No receipt recorded for incoming asset",
    };

    const result = custodyExceptionSchema.safeParse(exception);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("medium");
    }
  });

  it("should validate priority levels", () => {
    const validPriorities = ["low", "medium", "high", "critical"];

    validPriorities.forEach((priority) => {
      const result = custodyExceptionSchema.safeParse({
        assetId: "asset-123",
        exceptionType: "ASSET_NOT_FOUND",
        description: "Asset missing",
        priority,
      });
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid priority level", () => {
    const result = custodyExceptionSchema.safeParse({
      assetId: "asset-123",
      exceptionType: "ASSET_NOT_FOUND",
      description: "Asset missing",
      priority: "urgent", // invalid
    });
    expect(result.success).toBe(false);
  });
});
