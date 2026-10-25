# RecyTrack — Database Roadmap

## Current Schema (Phase 0)

The existing schema supports:

- User authentication and organization membership
- Customer management
- Collection scheduling with route dates
- Asset registration (structure only, not used in UI)
- Audit logging

## Migration Principles

1. **Additive Only** — Never delete columns or tables in production
2. **Backward Compatible** — New columns must be nullable or have defaults
3. **Reviewed Migrations** — All migrations require manual review before deployment
4. **Data Preservation** — Existing records must be retained
5. **Safe Rollback** — Consider rollback strategy for each migration

## Phase 1 — No Schema Changes

The current schema is sufficient for Phase 1 UI improvements.

## Phase 2 — Customer Enhancement

### New Fields

```prisma
model Customer {
  // Existing fields...

  // New fields (all nullable for backward compatibility)
  companyNumber    String?          // Company registration number
  vatNumber        String?          // VAT registration
  accountReference String?          // Internal account code
  notes            String?          // General notes
  isActive         Boolean          @default(true)

  sites            CustomerSite[]
  contacts         CustomerContact[]
}

model CustomerSite {
  id             String   @id @default(cuid())
  customerId     String
  organizationId String
  name           String
  address        String
  postcode       String
  isDefault      Boolean  @default(false)
  createdAt      DateTime @default(now())

  customer       Customer @relation(fields: [customerId], references: [id])
  collections    Collection[]

  @@unique([id, organizationId])
}

model CustomerContact {
  id             String   @id @default(cuid())
  customerId     String
  organizationId String
  name           String
  email          String?
  phone          String?
  role           String?  // e.g., "IT Manager", "Facilities"
  isPrimary      Boolean  @default(false)
  createdAt      DateTime @default(now())

  customer       Customer @relation(fields: [customerId], references: [id])

  @@unique([id, organizationId])
}
```

### Migration Strategy

1. Add new columns as nullable
2. Create new tables
3. Update application to use new fields
4. Backfill existing data if needed

## Phase 3 — Collection Operations

### Modified Fields

```prisma
model Collection {
  // Existing fields...

  // New fields
  siteId           String?          // Link to CustomerSite
  driverId         String?          // Assigned driver (User)
  vehicleReg       String?          // Vehicle registration
  scheduledTime    DateTime?        // Scheduled pickup time
  actualArrival    DateTime?        // Actual arrival time
  completedAt      DateTime?        // When fully completed
  signature        String?          // Base64 signature image
  signedBy         String?          // Name of person who signed

  site             CustomerSite?    @relation(...)
  driver           User?            @relation(...)
  photos           CollectionPhoto[]
}

model CollectionPhoto {
  id             String   @id @default(cuid())
  collectionId   String
  organizationId String
  url            String
  caption        String?
  takenAt        DateTime @default(now())

  collection     Collection @relation(...)
}
```

## Phase 4 — Warehouse & Receiving

### New Models

```prisma
model WarehouseLocation {
  id             String   @id @default(cuid())
  organizationId String
  name           String   // e.g., "Bay A1", "Shelf 3"
  type           String   // e.g., "Receiving", "Storage", "Processing"
  capacity       Int?
  isActive       Boolean  @default(true)

  assets         Asset[]
}

model Asset {
  // Existing fields...

  // New fields
  locationId       String?
  weight           Decimal?         // Weight in kg
  condition        String?          // e.g., "Working", "Faulty", "Unknown"
  dataStatus       DataStatus?
  purchaseValue    Decimal?
  currentValue     Decimal?
  disposalMethod   String?
  disposedAt       DateTime?

  location         WarehouseLocation? @relation(...)
  movements        AssetMovement[]
  destructionCerts DataDestruction[]
}

enum DataStatus {
  UNKNOWN
  NONE_PRESENT
  PENDING_ERASURE
  ERASED
  DESTROYED
  EXEMPT
}

model AssetMovement {
  id             String   @id @default(cuid())
  assetId        String
  organizationId String
  fromLocationId String?
  toLocationId   String?
  movedBy        String   // User ID
  movedAt        DateTime @default(now())
  reason         String?

  asset          Asset    @relation(...)
}
```

## Phase 5 — Data Destruction

### New Models

```prisma
model DataDestruction {
  id               String   @id @default(cuid())
  assetId          String
  organizationId   String
  method           DestructionMethod
  standard         String?  // e.g., "NIST 800-88", "HMG IA5"
  softwareName     String?
  softwareVersion  String?
  performedBy      String   // User ID
  performedAt      DateTime
  verifiedBy       String?  // User ID
  verifiedAt       DateTime?
  certificateUrl   String?
  notes            String?

  asset            Asset    @relation(...)
}

enum DestructionMethod {
  SOFTWARE_WIPE
  DEGAUSS
  SHRED
  INCINERATE
  CERTIFICATE_ONLY
}
```

## Phase 6 — Documents & Finance

### New Models

```prisma
model Document {
  id             String       @id @default(cuid())
  organizationId String
  type           DocumentType
  reference      String
  customerId     String?
  collectionId   String?
  title          String
  fileUrl        String
  generatedAt    DateTime     @default(now())
  validUntil     DateTime?

  customer       Customer?    @relation(...)
  collection     Collection?  @relation(...)
}

enum DocumentType {
  COLLECTION_MANIFEST
  DESTRUCTION_CERTIFICATE
  CHAIN_OF_CUSTODY
  INVOICE
  CREDIT_NOTE
  QUOTATION
  WASTE_TRANSFER_NOTE
  DUTY_OF_CARE
}

model Invoice {
  id             String        @id @default(cuid())
  organizationId String
  customerId     String
  reference      String
  status         InvoiceStatus
  subtotal       Decimal
  taxAmount      Decimal
  total          Decimal
  issuedAt       DateTime
  dueAt          DateTime
  paidAt         DateTime?

  customer       Customer      @relation(...)
  lineItems      InvoiceLine[]
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  CANCELLED
}
```

## Index Strategy

### Existing Indexes

- `User.email` (unique)
- `Organization.slug` (unique)
- `Membership.[userId, organizationId]` (unique)
- `Membership.[organizationId, role]`
- `Customer.[id, organizationId]` (unique)
- `Customer.[organizationId, name]`
- `Collection.[organizationId, reference]` (unique)
- `Collection.[organizationId, status, createdAt]`
- `Asset.[organizationId, assetTag]` (unique)
- `Asset.[organizationId, serialNumber]`
- `AuditLog.[organizationId, createdAt]`

### Future Indexes

- `Asset.[organizationId, status]`
- `Collection.[organizationId, customerId]`
- `Document.[organizationId, type, customerId]`
- `Invoice.[organizationId, status]`

## Migration Commands

```bash
# Development - create migration
npm run db:migrate

# Review generated SQL
cat prisma/migrations/*/migration.sql

# Production - apply migrations
npm run db:deploy

# Never use in production:
# prisma migrate reset
# prisma db push
```

## Rollback Procedures

1. **Column Addition** — Can be ignored by old code
2. **Table Addition** — Can be ignored by old code
3. **Column Removal** — Requires code update first
4. **Table Removal** — Requires code update first

For complex rollbacks, maintain down migration scripts separately.
