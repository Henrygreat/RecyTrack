import type { QuarantineReason, QuarantineStatus } from "@prisma/client";

// ============================================
// QUARANTINE LABELS
// ============================================

export const QUARANTINE_REASON_LABELS: Record<QuarantineReason, string> = {
  DAMAGE: "Physical Damage",
  DATA_SECURITY: "Data Security Concern",
  INVESTIGATION: "Under Investigation",
  COMPLIANCE: "Compliance Hold",
  CUSTOMER_REQUEST: "Customer Request",
  SUSPECTED_STOLEN: "Suspected Stolen",
  HAZARDOUS: "Hazardous Material",
  OTHER: "Other",
};

export const QUARANTINE_STATUS_LABELS: Record<QuarantineStatus, string> = {
  ACTIVE: "Active",
  RELEASED: "Released",
  DISPOSED: "Disposed",
};
