import { z } from "zod";

// ============================================
// CUSTOMER VALIDATION
// ============================================

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(160),
  customerType: z.enum(["BUSINESS", "INDIVIDUAL"]).default("BUSINESS"),
  companyNumber: z.string().trim().max(20).optional().or(z.literal("")),
  vatNumber: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.union([z.string().email("Invalid email address"), z.literal("")]).optional(),
  phone: z.string().max(40).optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().max(240).optional().or(z.literal("")),
  postcode: z.string().max(16).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  // Legacy field
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
});

export const customerUpdateSchema = customerSchema.extend({
  id: z.string().min(1),
});

// ============================================
// SITE VALIDATION
// ============================================

export const siteSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  name: z.string().trim().min(2, "Site name must be at least 2 characters").max(160),
  address: z.string().trim().min(5, "Address must be at least 5 characters").max(240),
  postcode: z.string().trim().min(3, "Postcode is required").max(16),
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  contactEmail: z.union([z.string().email("Invalid email address"), z.literal("")]).optional(),
  collectionInstructions: z.string().max(1000).optional().or(z.literal("")),
  vehicleAccessNotes: z.string().max(500).optional().or(z.literal("")),
  openingHours: z.string().max(200).optional().or(z.literal("")),
  isDefault: z.coerce.boolean().default(false),
  zoneId: z.string().optional().or(z.literal("")),
});

export const siteUpdateSchema = siteSchema.extend({
  id: z.string().min(1),
});

// ============================================
// CONTACT VALIDATION
// ============================================

export const contactSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  siteId: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.union([z.string().email("Invalid email address"), z.literal("")]).optional(),
  phone: z.string().max(40).optional().or(z.literal("")),
  jobTitle: z.string().max(100).optional().or(z.literal("")),
  isPrimary: z.coerce.boolean().default(false),
  isBilling: z.coerce.boolean().default(false),
  isOperational: z.coerce.boolean().default(false),
});

export const contactUpdateSchema = contactSchema.extend({
  id: z.string().min(1),
});

// ============================================
// CUSTOMER INVITATION VALIDATION
// ============================================

export const invitationSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  siteId: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address"),
  role: z.enum(["CUSTOMER_ADMIN", "CUSTOMER_USER"]).default("CUSTOMER_USER"),
});

// ============================================
// COLLECTION VALIDATION
// ============================================

export const collectionSchema = z.object({
  customerId: z.string().min(1),
  address: z.string().trim().min(5).max(240),
  postcode: z.string().trim().min(3).max(16),
  itemEstimate: z.coerce.number().int().min(0).max(100000),
  notes: z.string().max(2000).optional(),
  routeDateId: z.string().optional(),
  requestedDate: z.string().optional(),
}).refine(
  (v) => Boolean(v.routeDateId) || Boolean(v.requestedDate),
  { message: "Choose a scheduled route or request an alternative date" }
);

export const statusSchema = z.enum([
  "DRAFT",
  "REQUESTED",
  "CONFIRMED",  // Legacy status, equivalent to APPROVED
  "APPROVED",
  "SCHEDULED",
  "ASSIGNED",
  "IN_TRANSIT",
  "COLLECTED",
  "RECEIVED",
  "COMPLETED",
  "CANCELLED",
  "EXCEPTION",
]);

// ============================================
// SEARCH & FILTER VALIDATION
// ============================================

export const searchParamsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED", "all"]).optional(),
  type: z.enum(["BUSINESS", "INDIVIDUAL", "all"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// ============================================
// ASSET VALIDATION
// ============================================

export const assetCategoryEnum = z.enum([
  "LAPTOP",
  "DESKTOP",
  "SERVER",
  "MONITOR",
  "MOBILE_PHONE",
  "TABLET",
  "PRINTER",
  "NETWORKING",
  "STORAGE_DEVICE",
  "UPS_BATTERY",
  "PERIPHERAL",
  "CABLE_ACCESSORY",
  "OTHER",
]);

export const physicalConditionEnum = z.enum([
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
  "DAMAGED",
  "FOR_PARTS",
]);

export const functionalConditionEnum = z.enum([
  "WORKING",
  "PARTIAL",
  "NOT_WORKING",
  "UNTESTED",
]);

export const dataBearingStatusEnum = z.enum([
  "NOT_APPLICABLE",
  "NOT_ASSESSED",
  "DATA_PRESENT",
  "WIPED_STANDARD",
  "WIPED_CERTIFIED",
  "PHYSICALLY_DESTROYED",
]);

export const dispositionOutcomeEnum = z.enum([
  "PENDING",
  "RESALE",
  "DONATION",
  "RECYCLE",
  "DESTROY",
  "RETURN",
]);

export const assetSchema = z.object({
  // Core fields
  category: assetCategoryEnum,
  categoryOther: z.string().max(100).optional().or(z.literal("")),
  manufacturer: z.string().trim().max(100).optional().or(z.literal("")),
  model: z.string().trim().max(100).optional().or(z.literal("")),
  serialNumber: z.string().trim().max(100).optional().or(z.literal("")),

  // Customer/Collection relationship
  customerId: z.string().optional().or(z.literal("")),
  siteId: z.string().optional().or(z.literal("")),
  collectionId: z.string().optional().or(z.literal("")),

  // Customer's asset tag
  customerAssetTag: z.string().trim().max(50).optional().or(z.literal("")),

  // Condition assessment
  physicalCondition: physicalConditionEnum.default("FAIR"),
  functionalCondition: functionalConditionEnum.default("UNTESTED"),
  conditionNotes: z.string().max(2000).optional().or(z.literal("")),

  // Data handling
  dataBearingStatus: dataBearingStatusEnum.default("NOT_ASSESSED"),
  storageType: z.string().max(50).optional().or(z.literal("")),
  storageCapacity: z.string().max(50).optional().or(z.literal("")),

  // Warehouse location
  warehouseLocationId: z.string().optional().or(z.literal("")),
  binLocation: z.string().max(50).optional().or(z.literal("")),

  // Valuation
  estimatedValue: z.coerce.number().min(0).max(1000000).optional(),
  weight: z.coerce.number().min(0).max(10000).optional(),

  // Disposition
  dispositionOutcome: dispositionOutcomeEnum.default("PENDING"),
  dispositionNotes: z.string().max(2000).optional().or(z.literal("")),

  // Notes
  internalNotes: z.string().max(4000).optional().or(z.literal("")),
});

export const assetUpdateSchema = assetSchema.extend({
  id: z.string().min(1),
});

// Data wipe recording schema
export const dataWipeSchema = z.object({
  assetId: z.string().min(1),
  dataWipeMethod: z.string().min(1, "Wipe method is required"),
  dataWipeDate: z.string().optional(),
  dataWipeCertificate: z.string().max(100).optional().or(z.literal("")),
  dataWipeOperator: z.string().max(100).optional().or(z.literal("")),
  newStatus: dataBearingStatusEnum,
});

// Type exports
export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type SiteInput = z.infer<typeof siteSchema>;
export type SiteUpdateInput = z.infer<typeof siteUpdateSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type InvitationInput = z.infer<typeof invitationSchema>;
export type SearchParams = z.infer<typeof searchParamsSchema>;
export type AssetInput = z.infer<typeof assetSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;
export type DataWipeInput = z.infer<typeof dataWipeSchema>;
