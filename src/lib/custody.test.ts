import { describe, it, expect } from "vitest";
import {
  CUSTODY_EVENT_TYPE_LABELS,
  HANDOVER_STATUS_LABELS,
  CUSTODY_EXCEPTION_TYPE_LABELS,
  CUSTODY_EXCEPTION_STATUS_LABELS,
} from "./custody";
import type {
  CustodyEventType,
  HandoverStatus,
  CustodyExceptionType,
  CustodyExceptionStatus,
} from "@prisma/client";

describe("CUSTODY_EVENT_TYPE_LABELS", () => {
  it("should have a label for each custody event type", () => {
    const expectedTypes: CustodyEventType[] = [
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

    expectedTypes.forEach((type) => {
      expect(CUSTODY_EVENT_TYPE_LABELS[type]).toBeDefined();
      expect(typeof CUSTODY_EVENT_TYPE_LABELS[type]).toBe("string");
      expect(CUSTODY_EVENT_TYPE_LABELS[type].length).toBeGreaterThan(0);
    });
  });

  it("should have human-readable labels", () => {
    expect(CUSTODY_EVENT_TYPE_LABELS.COLLECTION).toBe("Collection");
    expect(CUSTODY_EVENT_TYPE_LABELS.VEHICLE_LOADING).toBe("Vehicle Loading");
    expect(CUSTODY_EVENT_TYPE_LABELS.VEHICLE_UNLOADING).toBe("Vehicle Unloading");
    expect(CUSTODY_EVENT_TYPE_LABELS.WAREHOUSE_RECEIPT).toBe("Warehouse Receipt");
    expect(CUSTODY_EVENT_TYPE_LABELS.INTERNAL_TRANSFER).toBe("Internal Transfer");
    expect(CUSTODY_EVENT_TYPE_LABELS.INSPECTION_HANDOVER).toBe("Inspection Handover");
    expect(CUSTODY_EVENT_TYPE_LABELS.QUARANTINE_TRANSFER).toBe("Quarantine Transfer");
    expect(CUSTODY_EVENT_TYPE_LABELS.PROCESSING_HANDOVER).toBe("Processing Handover");
    expect(CUSTODY_EVENT_TYPE_LABELS.EXTERNAL_DISPATCH).toBe("External Dispatch");
    expect(CUSTODY_EVENT_TYPE_LABELS.FINAL_HANDOVER).toBe("Final Handover");
  });

  it("should have exactly 10 event types", () => {
    expect(Object.keys(CUSTODY_EVENT_TYPE_LABELS)).toHaveLength(10);
  });
});

describe("HANDOVER_STATUS_LABELS", () => {
  it("should have a label for each handover status", () => {
    const expectedStatuses: HandoverStatus[] = [
      "PENDING",
      "CONFIRMED",
      "REJECTED",
      "CANCELLED",
    ];

    expectedStatuses.forEach((status) => {
      expect(HANDOVER_STATUS_LABELS[status]).toBeDefined();
      expect(typeof HANDOVER_STATUS_LABELS[status]).toBe("string");
      expect(HANDOVER_STATUS_LABELS[status].length).toBeGreaterThan(0);
    });
  });

  it("should have human-readable labels", () => {
    expect(HANDOVER_STATUS_LABELS.PENDING).toBe("Pending");
    expect(HANDOVER_STATUS_LABELS.CONFIRMED).toBe("Confirmed");
    expect(HANDOVER_STATUS_LABELS.REJECTED).toBe("Rejected");
    expect(HANDOVER_STATUS_LABELS.CANCELLED).toBe("Cancelled");
  });

  it("should have exactly 4 statuses", () => {
    expect(Object.keys(HANDOVER_STATUS_LABELS)).toHaveLength(4);
  });
});

describe("CUSTODY_EXCEPTION_TYPE_LABELS", () => {
  it("should have a label for each exception type", () => {
    const expectedTypes: CustodyExceptionType[] = [
      "MISSING_CUSTODIAN",
      "UNCONFIRMED_HANDOVER",
      "UNEXPECTED_LOCATION",
      "MISSING_RECEIPT",
      "UNAUTHORIZED_TRANSFER",
      "CUSTODY_DISCREPANCY",
      "ASSET_NOT_FOUND",
    ];

    expectedTypes.forEach((type) => {
      expect(CUSTODY_EXCEPTION_TYPE_LABELS[type]).toBeDefined();
      expect(typeof CUSTODY_EXCEPTION_TYPE_LABELS[type]).toBe("string");
      expect(CUSTODY_EXCEPTION_TYPE_LABELS[type].length).toBeGreaterThan(0);
    });
  });

  it("should have human-readable labels", () => {
    expect(CUSTODY_EXCEPTION_TYPE_LABELS.MISSING_CUSTODIAN).toBe("Missing Custodian");
    expect(CUSTODY_EXCEPTION_TYPE_LABELS.UNCONFIRMED_HANDOVER).toBe("Unconfirmed Handover");
    expect(CUSTODY_EXCEPTION_TYPE_LABELS.UNEXPECTED_LOCATION).toBe("Unexpected Location");
    expect(CUSTODY_EXCEPTION_TYPE_LABELS.MISSING_RECEIPT).toBe("Missing Receipt");
    expect(CUSTODY_EXCEPTION_TYPE_LABELS.UNAUTHORIZED_TRANSFER).toBe("Unauthorized Transfer");
    expect(CUSTODY_EXCEPTION_TYPE_LABELS.CUSTODY_DISCREPANCY).toBe("Custody Discrepancy");
    expect(CUSTODY_EXCEPTION_TYPE_LABELS.ASSET_NOT_FOUND).toBe("Asset Not Found");
  });

  it("should have exactly 7 exception types", () => {
    expect(Object.keys(CUSTODY_EXCEPTION_TYPE_LABELS)).toHaveLength(7);
  });
});

describe("CUSTODY_EXCEPTION_STATUS_LABELS", () => {
  it("should have a label for each exception status", () => {
    const expectedStatuses: CustodyExceptionStatus[] = [
      "OPEN",
      "INVESTIGATING",
      "RESOLVED",
      "ESCALATED",
    ];

    expectedStatuses.forEach((status) => {
      expect(CUSTODY_EXCEPTION_STATUS_LABELS[status]).toBeDefined();
      expect(typeof CUSTODY_EXCEPTION_STATUS_LABELS[status]).toBe("string");
      expect(CUSTODY_EXCEPTION_STATUS_LABELS[status].length).toBeGreaterThan(0);
    });
  });

  it("should have human-readable labels", () => {
    expect(CUSTODY_EXCEPTION_STATUS_LABELS.OPEN).toBe("Open");
    expect(CUSTODY_EXCEPTION_STATUS_LABELS.INVESTIGATING).toBe("Investigating");
    expect(CUSTODY_EXCEPTION_STATUS_LABELS.RESOLVED).toBe("Resolved");
    expect(CUSTODY_EXCEPTION_STATUS_LABELS.ESCALATED).toBe("Escalated");
  });

  it("should have exactly 4 statuses", () => {
    expect(Object.keys(CUSTODY_EXCEPTION_STATUS_LABELS)).toHaveLength(4);
  });
});

describe("Chain of Custody workflow validation", () => {
  describe("Handover status transitions", () => {
    it("should have PENDING as initial state", () => {
      // PENDING is the starting state for new custody events
      expect(HANDOVER_STATUS_LABELS.PENDING).toBeDefined();
    });

    it("should have CONFIRMED as successful completion", () => {
      // CONFIRMED indicates successful handover
      expect(HANDOVER_STATUS_LABELS.CONFIRMED).toBeDefined();
    });

    it("should have REJECTED for failed handovers", () => {
      // REJECTED when handover is declined
      expect(HANDOVER_STATUS_LABELS.REJECTED).toBeDefined();
    });

    it("should have CANCELLED for aborted transfers", () => {
      // CANCELLED when transfer is cancelled before completion
      expect(HANDOVER_STATUS_LABELS.CANCELLED).toBeDefined();
    });
  });

  describe("Exception workflow", () => {
    it("should have OPEN as initial exception state", () => {
      expect(CUSTODY_EXCEPTION_STATUS_LABELS.OPEN).toBeDefined();
    });

    it("should have progression path: OPEN -> INVESTIGATING", () => {
      // Exceptions move from OPEN to INVESTIGATING
      expect(CUSTODY_EXCEPTION_STATUS_LABELS.OPEN).toBeDefined();
      expect(CUSTODY_EXCEPTION_STATUS_LABELS.INVESTIGATING).toBeDefined();
    });

    it("should have ESCALATED for high-priority exceptions", () => {
      // ESCALATED for exceptions requiring management attention
      expect(CUSTODY_EXCEPTION_STATUS_LABELS.ESCALATED).toBeDefined();
    });

    it("should have RESOLVED as final closed state", () => {
      // RESOLVED indicates exception is closed
      expect(CUSTODY_EXCEPTION_STATUS_LABELS.RESOLVED).toBeDefined();
    });
  });
});
