# RecyTrack — Permissions Matrix

## Role Definitions

| Role | Description | Typical Users |
|------|-------------|---------------|
| OWNER | Full system access, business settings | Company owners, directors |
| ADMIN | User management, all operations | Office managers, supervisors |
| OPERATIONS | Collection and customer management | Operations coordinators |
| DRIVER | Collection execution | Field staff, drivers |
| WAREHOUSE | Asset receiving and processing | Warehouse staff |
| CUSTOMER | Self-service portal access | Customer contacts |

## Current Implementation

### Role Groups

```typescript
STAFF_ROLES: OWNER | ADMIN | OPERATIONS | WAREHOUSE
MANAGEMENT_ROLES: OWNER | ADMIN | OPERATIONS
```

### Access Control

| Feature | OWNER | ADMIN | OPERATIONS | DRIVER | WAREHOUSE | CUSTOMER |
|---------|:-----:|:-----:|:----------:|:------:|:---------:|:--------:|
| **Dashboard** |
| View overview | Y | Y | Y | Y | Y | N |
| View all metrics | Y | Y | Y | Y | Y | N |
| **Customers** |
| View list | Y | Y | Y | Y | Y | N |
| Create customer | Y | Y | Y | N | N | N |
| Edit customer | Y | Y | Y | N | N | N |
| Delete customer | Y | Y | N | N | N | N |
| **Collections** |
| View list | Y | Y | Y | Y | Y | N |
| Book collection | Y | Y | Y | N | N | N |
| Update status | Y | Y | Y | N | N | N |
| Cancel collection | Y | Y | Y | N | N | N |
| **Routes** |
| View calendar | Y | Y | Y | Y | Y | N |
| Manage routes | Y | Y | Y | N | N | N |
| **Assets** |
| View inventory | Y | Y | Y | Y | Y | N |
| Register assets | Y | Y | Y | N | Y | N |
| Update status | Y | Y | Y | N | Y | N |
| **Settings** |
| View settings | Y | Y | N | N | N | N |
| Modify settings | Y | N | N | N | N | N |
| **Users** |
| View users | Y | Y | N | N | N | N |
| Manage users | Y | Y | N | N | N | N |
| Assign roles | Y | Y | N | N | N | N |

## Target Implementation

### Phase 1 — Current Scope

No permission changes. Existing MANAGEMENT_ROLES check is sufficient.

### Phase 2+ — Granular Permissions

```prisma
model Permission {
  id       String @id @default(cuid())
  resource String // e.g., "customer", "collection"
  action   String // e.g., "create", "read", "update", "delete"

  roles    RolePermission[]
}

model RolePermission {
  roleId       String
  permissionId String

  @@id([roleId, permissionId])
}
```

### Permission Checks

```typescript
// Current (simple role check)
await requireMember(undefined, MANAGEMENT_ROLES);

// Future (granular permission check)
await requirePermission("collection", "create");
```

## Customer Portal Permissions

### Self-Service Features

| Feature | Access Level |
|---------|--------------|
| View own collections | Read own data only |
| Request collection | Create for own company |
| View collection status | Read own data only |
| View assets | Read own data only |
| Download certificates | Read own data only |
| Update contact info | Update own profile |

### Data Isolation

- Customers see only their own organization's data
- No cross-customer visibility
- No access to other customers' assets
- No access to internal operations data

## Audit Requirements

All permission-gated actions are logged:

```typescript
await prisma.auditLog.create({
  data: {
    organizationId,
    actorUserId: userId,
    action: "CUSTOMER_CREATED",
    entityType: "Customer",
    entityId: customer.id,
    details: { /* relevant data */ },
  },
});
```

## Security Considerations

1. **Server-Side Enforcement** — All checks on server, never trust client
2. **Organization Scope** — Always filter by organizationId
3. **Fail Closed** — Default deny, explicit allow
4. **Audit Trail** — Log all significant actions
5. **Session Validation** — Verify session on every request
