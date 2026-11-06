import { Role } from "@prisma/client";

// Role hierarchy - users can only assign roles at or below their level
export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 100,
  ADMIN: 80,
  OPERATIONS: 60,
  WAREHOUSE: 40,
  DRIVER: 20,
  CUSTOMER: 0,
};

// Human-readable role labels
export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Administrator",
  OPERATIONS: "Operations Manager",
  WAREHOUSE: "Warehouse Staff",
  DRIVER: "Driver",
  CUSTOMER: "Customer",
};

// Roles that can be assigned to staff (excludes OWNER and CUSTOMER)
export const ASSIGNABLE_STAFF_ROLES: Role[] = ["ADMIN", "OPERATIONS", "WAREHOUSE", "DRIVER"];

// Role descriptions for the invite form
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: "Full access to all features including user management and settings",
  OPERATIONS: "Manage collections, customers, routes, and daily operations",
  WAREHOUSE: "Process assets, run inspections, manage warehouse inventory",
  DRIVER: "View and update assigned collections, scan assets",
};
