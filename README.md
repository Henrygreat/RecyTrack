# ENCIF RecyTrack — Phase 1

Working Next.js / Prisma starter for a standalone IT recycling operations application.

## Included
- Credentials login using Auth.js with bcrypt password hashes and database-backed users.
- Organisation memberships and roles (OWNER, ADMIN, OPERATIONS, DRIVER, WAREHOUSE, CUSTOMER).
- Server-side organisation-scoped dashboard, customer records, collection bookings, route calendar and collection status workflow.
- Scheduled route capacity checks, alternative date requests, audit logs and basic asset schema.
- PostgreSQL, Docker configuration, seed data, responsive admin interface.

## Local setup
1. Install Node.js 22+, Docker and Git.
2. Copy `.env.example` to `.env`. Set a strong `AUTH_SECRET` (`openssl rand -base64 32`), `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `DATABASE_URL`.
3. Set `POSTGRES_PASSWORD` to match the password in `DATABASE_URL` (default local example is `change_me`, **not for production**).
4. Run `docker compose up -d db`.
5. Run `npm install`.
6. Run `npx prisma migrate dev --name init` to create the initial migration locally.
7. Run `npm run db:seed`.
8. Run `npm run dev` and open http://localhost:3000/login.

## Production / Coolify
- Provision managed PostgreSQL or a separate private PostgreSQL service.
- Set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL` and `NODE_ENV=production` as deployment secrets.
- Create and **commit** a Prisma migration using `npx prisma migrate dev --name init` in development, then run `npx prisma migrate deploy` against production before deploying.
- Build with Dockerfile. Use HTTPS and a trusted domain, configure backups, and do not expose PostgreSQL publicly.
- Do not run the seed script against production without reviewing its demo data.

## Scope and known limitations
This is a Phase 1 foundation, not a production-ready ITAD compliance platform. Driver-specific permissions, asset intake screens, barcode scanning, digital signatures, certificate generation, erasure integrations, customer self-service, buyback valuations and payments are **not yet implemented**. Driver and customer roles are represented in the database but are not provisioned through a user-management UI. The dashboard selects the first membership for a user; an organisation switcher is a future enhancement. Collections are currently entered by authorised staff only. Routes are seeded for demonstration; a route-management editor and postcode-matching UI remain to be built. Date capacity is counted per booking, not by weight/vehicle volume. Add automated integration/security tests, rate limiting, password reset, CSRF/security review, data-retention controls and monitoring before a public launch.

### Multi-tenancy security note
All exposed read/write queries are scoped by authenticated organisation membership. Composite foreign keys guard cross-organisation relationships. Review any future API endpoints and jobs to preserve this invariant. Role restrictions are enforced server-side for management mutations.

## Architecture
- `src/auth.ts` credentials authentication
- `src/lib/access.ts` server-side authorisation
- `src/app/actions.ts` validated mutations and audit logging
- `src/app/dashboard/*` protected management UI
- `prisma/schema.prisma` data model
- `prisma/seed.ts` demo owner and route dates

Owned by ENCIF. Review licence and dependencies before commercial redistribution.
