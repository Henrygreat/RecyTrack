# RecyTrack — Target Architecture

## Vision

RecyTrack will be a comprehensive, premium-quality IT asset disposition platform supporting the complete lifecycle from collection through data destruction to recycling or resale.

## Design Principles

1. **Single Company Operation** — Not multi-tenant SaaS; one recycling company serving multiple customers
2. **Organization Scope** — Retain existing Organization/Membership model for backward compatibility
3. **Additive Changes** — New features extend, don't replace existing functionality
4. **Production Safety** — No destructive migrations, preserve all existing data
5. **Premium Quality** — Visual polish comparable to Linear, Stripe Dashboard

## Functional Modules

### Phase 1 — Foundation (Current Focus)

- Premium application shell
- Collapsible navigation sidebar
- Dashboard with real metrics
- Improved existing screens
- Design system components
- Responsive layouts
- Loading and error states

### Phase 2 — Customer Management

- Customer details view
- Multiple sites per customer
- Contact management
- Customer portal access
- Communication history

### Phase 3 — Collection Operations

- Collection scheduling
- Route optimization
- Driver assignments
- Mobile driver interface
- Real-time tracking
- Collection notes and photos

### Phase 4 — Warehouse & Receiving

- Barcode scanning
- Asset check-in
- Inventory management
- Storage locations
- Stock movements
- Warehouse dashboard

### Phase 5 — Asset Lifecycle

- Individual asset tracking
- Category management
- Condition assessment
- Data sanitization workflow
- Destruction certificates
- Chain of custody

### Phase 6 — Business Operations

- Document generation
- Compliance certificates
- Invoicing
- Buyback valuations
- Financial reporting
- Analytics dashboard

### Phase 7 — Platform Features

- User management
- Role permissions UI
- Audit trail viewer
- System settings
- Email notifications
- API integrations

## Technical Architecture

### Component Library

```
src/components/
├── ui/                    # Primitive components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── table.tsx
│   ├── badge.tsx
│   ├── skeleton.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   └── toast.tsx
├── layout/                # Layout components
│   ├── sidebar.tsx
│   ├── header.tsx
│   ├── breadcrumb.tsx
│   └── page-container.tsx
├── dashboard/             # Dashboard-specific
│   ├── metric-card.tsx
│   ├── activity-feed.tsx
│   └── status-chart.tsx
└── shared/                # Shared components
    ├── empty-state.tsx
    ├── data-table.tsx
    ├── search-input.tsx
    └── loading-state.tsx
```

### Navigation Structure

```
Operations
├── Dashboard
├── Customers
├── Collections
└── Route Calendar

Asset Management
├── Asset Inventory        [Future]
├── Warehouse              [Future]
└── Data Destruction       [Future]

Business
├── Documents              [Future]
├── Finance                [Future]
└── Reports                [Future]

Administration
├── Settings               [Future]
└── Users                  [Future]
```

### State Management

- Server Components for data fetching
- React Server Actions for mutations
- URL state for filters/pagination
- React Context for UI state (sidebar, theme)

### Data Fetching Patterns

```typescript
// Server Component
export default async function Page() {
  const data = await prisma.model.findMany({
    where: { organizationId },
  });
  return <ClientComponent data={data} />;
}

// Client mutations via Server Actions
"use server"
export async function createItem(formData: FormData) {
  await prisma.model.create({ data });
  revalidatePath("/path");
  redirect("/path");
}
```

## Design System

### Colors

```css
/* Brand */
--navy-900: #0a1628;
--navy-800: #142b3d;
--navy-700: #1e3a50;
--teal-600: #0d9488;
--teal-500: #14b8a6;
--teal-400: #2dd4bf;

/* Neutrals */
--slate-50: #f8fafc;
--slate-100: #f1f5f9;
--slate-200: #e2e8f0;
--slate-600: #475569;
--slate-900: #0f172a;

/* Status */
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### Typography

```css
/* Headings */
font-family: Inter, system-ui, sans-serif;
--text-4xl: 2.25rem;   /* Page titles */
--text-2xl: 1.5rem;    /* Section headings */
--text-xl: 1.25rem;    /* Card headings */
--text-base: 1rem;     /* Body text */
--text-sm: 0.875rem;   /* Secondary text */
--text-xs: 0.75rem;    /* Labels */
```

### Spacing

```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-12: 3rem;
```

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

## Security Model

### Authentication

- Auth.js with Credentials provider
- JWT sessions with secure cookies
- Trust host for reverse proxy
- Redirect-based protection

### Authorization

- Organization-scoped data
- Role-based access control
- Server-side validation
- Audit logging

### Data Protection

- Prisma ORM (SQL injection protection)
- Input validation with Zod
- CSRF protection via Server Actions
- No secrets in client bundles

## Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90
- Core Web Vitals: All green

## Monitoring & Observability

- Structured logging
- Error tracking
- Performance metrics
- Audit trail
- Health endpoints
