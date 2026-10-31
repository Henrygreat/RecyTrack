import { describe, it, expect } from "vitest";
import {
  QUARANTINE_REASON_LABELS,
  QUARANTINE_STATUS_LABELS,
} from "./quarantine";
import type { QuarantineReason, QuarantineStatus } from "@prisma/client";

describe("QUARANTINE_REASON_LABELS", () => {
  it("should have a label for each quarantine reason", () => {
    const expectedReasons: QuarantineReason[] = [
      "DAMAGE",
      "DATA_SECURITY",
      "INVESTIGATION",
      "COMPLIANCE",
      "CUSTOMER_REQUEST",
      "SUSPECTED_STOLEN",
      "HAZARDOUS",
      "OTHER",
    ];

    expectedReasons.forEach((reason) => {
      expect(QUARANTINE_REASON_LABELS[reason]).toBeDefined();
      expect(typeof QUARANTINE_REASON_LABELS[reason]).toBe("string");
      expect(QUARANTINE_REASON_LABELS[reason].length).toBeGreaterThan(0);
    });
  });

  it("should have human-readable labels", () => {
    expect(QUARANTINE_REASON_LABELS.DAMAGE).toBe("Physical Damage");
    expect(QUARANTINE_REASON_LABELS.DATA_SECURITY).toBe("Data Security Concern");
    expect(QUARANTINE_REASON_LABELS.INVESTIGATION).toBe("Under Investigation");
    expect(QUARANTINE_REASON_LABELS.COMPLIANCE).toBe("Compliance Hold");
    expect(QUARANTINE_REASON_LABELS.CUSTOMER_REQUEST).toBe("Customer Request");
    expect(QUARANTINE_REASON_LABELS.SUSPECTED_STOLEN).toBe("Suspected Stolen");
    expect(QUARANTINE_REASON_LABELS.HAZARDOUS).toBe("Hazardous Material");
    expect(QUARANTINE_REASON_LABELS.OTHER).toBe("Other");
  });

  it("should have exactly 8 reasons", () => {
    expect(Object.keys(QUARANTINE_REASON_LABELS)).toHaveLength(8);
  });
});

describe("QUARANTINE_STATUS_LABELS", () => {
  it("should have a label for each quarantine status", () => {
    const expectedStatuses: QuarantineStatus[] = [
      "ACTIVE",
      "RELEASED",
      "DISPOSED",
    ];

    expectedStatuses.forEach((status) => {
      expect(QUARANTINE_STATUS_LABELS[status]).toBeDefined();
      expect(typeof QUARANTINE_STATUS_LABELS[status]).toBe("string");
      expect(QUARANTINE_STATUS_LABELS[status].length).toBeGreaterThan(0);
    });
  });

  it("should have human-readable labels", () => {
    expect(QUARANTINE_STATUS_LABELS.ACTIVE).toBe("Active");
    expect(QUARANTINE_STATUS_LABELS.RELEASED).toBe("Released");
    expect(QUARANTINE_STATUS_LABELS.DISPOSED).toBe("Disposed");
  });

  it("should have exactly 3 statuses", () => {
    expect(Object.keys(QUARANTINE_STATUS_LABELS)).toHaveLength(3);
  });
});
