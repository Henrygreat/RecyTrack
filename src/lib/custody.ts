import type {
  CustodyEventType,
  HandoverStatus,
  CustodyExceptionType,
  CustodyExceptionStatus,
} from "@prisma/client";

// ============================================
// CUSTODY LABELS
// ============================================

export const CUSTODY_EVENT_TYPE_LABELS: Record<CustodyEventType, string> = {
  COLLECTION: "Collection",
  VEHICLE_LOADING: "Vehicle Loading",
  VEHICLE_UNLOADING: "Vehicle Unloading",
  WAREHOUSE_RECEIPT: "Warehouse Receipt",
  INTERNAL_TRANSFER: "Internal Transfer",
  INSPECTION_HANDOVER: "Inspection Handover",
  QUARANTINE_TRANSFER: "Quarantine Transfer",
  PROCESSING_HANDOVER: "Processing Handover",
  EXTERNAL_DISPATCH: "External Dispatch",
  FINAL_HANDOVER: "Final Handover",
};

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const CUSTODY_EXCEPTION_TYPE_LABELS: Record<CustodyExceptionType, string> = {
  MISSING_CUSTODIAN: "Missing Custodian",
  UNCONFIRMED_HANDOVER: "Unconfirmed Handover",
  UNEXPECTED_LOCATION: "Unexpected Location",
  MISSING_RECEIPT: "Missing Receipt",
  UNAUTHORIZED_TRANSFER: "Unauthorized Transfer",
  CUSTODY_DISCREPANCY: "Custody Discrepancy",
  ASSET_NOT_FOUND: "Asset Not Found",
};

export const CUSTODY_EXCEPTION_STATUS_LABELS: Record<CustodyExceptionStatus, string> = {
  OPEN: "Open",
  INVESTIGATING: "Investigating",
  RESOLVED: "Resolved",
  ESCALATED: "Escalated",
};
