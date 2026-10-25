# RecyTrack — Current State Architecture

## Overview

RecyTrack is an IT asset disposition and recycling operations management platform. The application is deployed on Coolify using Docker, with a PostgreSQL database.

**Production Status:** Live and operational. Administrator can log in and access the dashboard.

## Technology Stack

| Component | Version | Notes |
|-----------|---------|-------|
| Next.js | 15.5.x | App Router, Server Components |
| React | 19.1.x | Latest stable |
| TypeScript | 5.9.x | Strict mode enabled |
| Prisma | 6.19.3 | ORM with PostgreSQL |
| Auth.js | 5.0.0-beta.29 | Credentials provider, JWT sessions |
| Zod | 4.1.0 | Schema validation |
| bcryptjs | 3.0.2 | Password hashing |
| Lucide React | 0.468.0 | Icons (unused currently) |
| Node.js | 22 Alpine | Docker runtime |

## Database Schema

### Core Models

```
User
├── id (cuid)
├── name
├── email (unique)
├── passwordHash
├── createdAt
└── memberships[]

Organization
├── id (cuid)
├── name
├── slug (unique)
├── createdAt
├── memberships[]
├── customers[]
├── zones[]
├── routeDates[]
├── collections[]
├── assets[]
└── auditLogs[]

Membership
├── id (cuid)
├── userId
├── organizationId
├── role (enum)
└── @@unique([userId, organizationId])
```

### Business Models

```
Customer
├── id, organizationId, name, contactName
├── email, phone, address, postcode
└── collections[]

CollectionZone
├── id, organizationId, name
├── postcodePrefixes[]
└── routeDates[]

RouteDate
├── id, organizationId, zoneId
├── serviceDate, capacity, isOpen
└── collections[]

Collection
├── id, organizationId, reference
├── customerId, routeDateId
├── bookingMode, requestedDate, status
├── address, postcode, itemEstimate, notes
├── driverName, collectedAt, receivedAt
└── assets[]

Asset
├── id, organizationId, collectionId
├── assetTag, category, manufacturer
├── model, serialNumber, status
└── createdAt

AuditLog
├── id, organizationId, actorUserId
├── action, entityType, entityId
├── details (JSON)
└── createdAt
```

### Enums

```typescript
Role: OWNER | ADMIN | OPERATIONS | DRIVER | WAREHOUSE | CUSTOMER

CollectionStatus: REQUESTED | CONFIRMED | ASSIGNED | IN_TRANSIT |
                  COLLECTED | RECEIVED | CANCELLED

BookingMode: SCHEDULED | ALTERNATIVE

AssetStatus: EXPECTED | COLLECTED | RECEIVED | INSPECTION |
             DATA_ERASURE | REUSE | RECYCLE | RELEASED
```

## Application Routes

### Implemented Routes

| Route | Type | Functionality |
|-------|------|---------------|
| `/` | Redirect | → /dashboard |
| `/login` | Page | Credentials login form |
| `/no-access` | Page | Access denied message |
| `/dashboard` | Protected | Operations overview with metrics |
| `/dashboard/customers` | Protected | Customer list |
| `/dashboard/customers/new` | Protected | Create customer form |
| `/dashboard/collections` | Protected | Collection list with status actions |
| `/dashboard/collections/new` | Protected | Book collection form |
| `/dashboard/routes` | Protected | Route calendar view |
| `/api/auth/[...nextauth]` | API | Auth.js handlers |

### Not Implemented

- Asset Inventory
- Warehouse
- Data Destruction
- Documents
- Finance
- Reports
- Settings
- User Management
- Search
- Notifications

## Authentication & Authorization

### Auth.js Configuration

- **Strategy:** JWT sessions
- **Provider:** Credentials (email/password)
- **Trust Host:** Enabled for reverse proxy
- **Login Page:** /login
- **Error Page:** /login

### Role-Based Access

```typescript
STAFF_ROLES: OWNER | ADMIN | OPERATIONS | WAREHOUSE
MANAGEMENT_ROLES: OWNER | ADMIN | OPERATIONS
```

**Access Control Pattern:**
```typescript
const { membership } = await requireMember();
// Redirects to /login if not authenticated
// Redirects to /no-access if no organization membership
```

## File Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home redirect
│   ├── globals.css         # All styles
│   ├── actions.ts          # Server actions
│   ├── login/
│   │   ├── page.tsx        # Login form (client)
│   │   └── actions.ts      # Login action
│   ├── no-access/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx      # Dashboard shell
│   │   ├── page.tsx        # Overview
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── collections/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   └── routes/page.tsx
│   └── api/auth/[...nextauth]/route.ts
├── lib/
│   ├── prisma.ts           # Prisma client
│   ├── access.ts           # Auth helpers
│   └── validation.ts       # Zod schemas
└── auth.ts                 # Auth.js config
```

## Deployment Architecture

### Docker Build Stages

1. **deps** - Install dependencies (`npm ci --omit=optional`)
2. **builder** - Generate Prisma client, build Next.js
3. **prod-deps** - Production dependencies only
4. **runner** - Final image with standalone output

### Runtime Flow

```
docker-entrypoint.sh
├── Validate DATABASE_URL exists
├── Run prisma migrate deploy
└── Start Node.js server
```

### Environment Variables (Coolify)

| Variable | Purpose |
|----------|---------|
| DATABASE_URL | PostgreSQL connection |
| AUTH_SECRET | Auth.js encryption key |
| AUTH_URL | Application URL |

## Current Limitations

1. **Styling:** Basic CSS, no component library
2. **Navigation:** Simple sidebar, no responsive mobile menu
3. **Empty States:** Minimal empty state UI
4. **Loading States:** No loading skeletons
5. **Error Handling:** Basic error boundaries
6. **Search:** Not implemented
7. **Pagination:** Fixed `take: 100` limits
8. **Icons:** Lucide installed but unused
9. **Tests:** Vitest configured but no tests written

## Security Considerations

1. **Password Hashing:** bcrypt with cost factor 12
2. **SQL Injection:** Protected by Prisma ORM
3. **XSS:** React's default escaping
4. **CSRF:** Server actions are protected
5. **Auth:** JWT with secure httpOnly cookies
6. **Secrets:** Runtime injection only

## Technical Debt

1. **Inline Styles:** Several components use inline styles
2. **Minified Code:** Some files have compressed formatting
3. **No Loading States:** Pages load without skeleton UI
4. **No Error Boundaries:** Errors crash the page
5. **No Tests:** Test framework configured but empty
6. **No Linting Config:** ESLint configured but no custom rules
