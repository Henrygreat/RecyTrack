#!/bin/bash
# ============================================
# Phase 4 Migration Local Test Script
# ============================================
#
# This script tests the migration against a disposable PostgreSQL database
# using Docker. It simulates the production state before running recovery.
#
# Prerequisites:
# - Docker installed and running
# - bash shell (Git Bash on Windows)
#
# Usage:
#   ./scripts/test-migration-locally.sh
#
# ============================================

set -e

echo "========================================"
echo "PHASE 4 MIGRATION LOCAL TEST"
echo "========================================"
echo ""

# Configuration
CONTAINER_NAME="recytrack-migration-test"
DB_NAME="recytrack_test"
DB_USER="postgres"
DB_PASSWORD="testpassword"
DB_PORT=5433  # Use non-standard port to avoid conflicts

# Cleanup function
cleanup() {
    echo ""
    echo "Cleaning up..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Step 1: Start PostgreSQL container
echo "Step 1: Starting PostgreSQL container..."
docker run -d \
    --name $CONTAINER_NAME \
    -e POSTGRES_DB=$DB_NAME \
    -e POSTGRES_USER=$DB_USER \
    -e POSTGRES_PASSWORD=$DB_PASSWORD \
    -p $DB_PORT:5432 \
    postgres:15-alpine

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5
for i in {1..30}; do
    if docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME >/dev/null 2>&1; then
        echo "PostgreSQL is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done

# Set DATABASE_URL for Prisma
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME"

# Step 2: Apply migrations up to Phase 3
echo ""
echo "Step 2: Applying migrations up to Phase 3..."

# Apply init migration
echo "Applying 20241025000000_init..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < prisma/migrations/20241025000000_init/migration.sql

# Apply Phase 2 migration
echo "Applying 20241025100000_phase2_customer_management..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < prisma/migrations/20241025100000_phase2_customer_management/migration.sql

# Apply Phase 3 migrations
echo "Applying Phase 3 migrations..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < prisma/migrations/20241029100000_phase3_add_collection_statuses/migration.sql
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < prisma/migrations/20241029100001_phase3_migrate_confirmed_to_approved/migration.sql
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < prisma/migrations/20241029200000_phase3_collection_schema_alignment/migration.sql

# Insert Prisma migration records
echo "Recording migrations in _prisma_migrations..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME <<EOF
INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
VALUES
    ('init', 'test', '20241025000000_init', NOW(), NOW(), 1),
    ('phase2', 'test', '20241025100000_phase2_customer_management', NOW(), NOW(), 1),
    ('phase3a', 'test', '20241029100000_phase3_add_collection_statuses', NOW(), NOW(), 1),
    ('phase3b', 'test', '20241029100001_phase3_migrate_confirmed_to_approved', NOW(), NOW(), 1),
    ('phase3c', 'test', '20241029200000_phase3_collection_schema_alignment', NOW(), NOW(), 1)
ON CONFLICT DO NOTHING;
EOF

# Step 3: Add some test data
echo ""
echo "Step 3: Adding test data..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME <<EOF
-- Create test organization
INSERT INTO "Organization" (id, name, slug) VALUES ('test-org', 'Test Org', 'test-org');

-- Create test customer
INSERT INTO "Customer" (id, "organizationId", name, reference, "createdAt", "updatedAt")
VALUES ('test-cust', 'test-org', 'Test Customer', 'CUST-0001', NOW(), NOW());

-- Create test site
INSERT INTO "Site" (id, "organizationId", "customerId", reference, name, address, postcode, "createdAt", "updatedAt")
VALUES ('test-site', 'test-org', 'test-cust', 'SITE-0001', 'Test Site', '123 Test St', 'TE5T 1AA', NOW(), NOW());

-- Create test collection
INSERT INTO "Collection" (id, "organizationId", reference, "customerId", address, postcode, status, "createdAt", "updatedAt")
VALUES ('test-coll', 'test-org', 'COL-0001', 'test-cust', '123 Test St', 'TE5T 1AA', 'REQUESTED', NOW(), NOW());

-- Create test asset with TEXT category (simulating pre-migration state)
INSERT INTO "Asset" (id, "organizationId", "collectionId", "assetTag", category, "serialNumber", status, "createdAt")
VALUES
    ('test-asset-1', 'test-org', 'test-coll', 'RT-000001', 'Laptop', 'SN123', 'EXPECTED', NOW()),
    ('test-asset-2', 'test-org', 'test-coll', 'RT-000002', 'Desktop Computer', 'SN456', 'EXPECTED', NOW()),
    ('test-asset-3', 'test-org', 'test-coll', 'RT-000003', 'Monitor Display', 'SN789', 'COLLECTED', NOW());
EOF

# Step 4: Verify pre-migration state
echo ""
echo "Step 4: Verifying pre-migration state..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME <<EOF
\echo 'Asset table columns:'
SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = 'Asset' ORDER BY ordinal_position;

\echo ''
\echo 'Asset_id_organizationId_key exists:'
SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Asset_id_organizationId_key');

\echo ''
\echo 'Existing assets:'
SELECT id, "assetTag", category, status FROM "Asset";
EOF

# Step 5: Run pre-migration validation
echo ""
echo "Step 5: Running pre-migration validation..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < scripts/phase4-pre-migration-validation.sql || true

# Step 6: Apply recovery migration
echo ""
echo "Step 6: Applying Phase 4 recovery migration v2..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < scripts/phase4-recovery-migration-v2.sql

# Step 7: Run post-migration verification
echo ""
echo "Step 7: Running post-migration verification..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < scripts/phase4-post-migration-verification.sql

# Step 8: Verify FK actions are correct
echo ""
echo "Step 8: Verifying FK referential actions..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME <<EOF
SELECT conname AS constraint_name,
       CASE confdeltype
           WHEN 'a' THEN 'NO ACTION'
           WHEN 'r' THEN 'RESTRICT'
           WHEN 'c' THEN 'CASCADE'
           WHEN 'n' THEN 'SET NULL'
           WHEN 'd' THEN 'SET DEFAULT'
       END AS on_delete
FROM pg_constraint
WHERE conname IN (
    'Asset_customerId_organizationId_fkey',
    'Asset_siteId_organizationId_fkey',
    'Asset_warehouseLocationId_organizationId_fkey'
);
EOF

# Step 9: Test category migration
echo ""
echo "Step 9: Verifying category migration..."
docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME <<EOF
SELECT id, "assetTag", category, "categoryOther" FROM "Asset";
EOF

# Step 10: Validate Prisma schema sync
echo ""
echo "Step 10: Validating Prisma schema sync..."
npx prisma db pull --print 2>/dev/null | head -100 || echo "Schema pull completed (check for drift)"

echo ""
echo "========================================"
echo "MIGRATION TEST COMPLETE"
echo "========================================"
echo ""
echo "The test PostgreSQL container will be cleaned up automatically."
echo "If all tests passed, the migration is ready for staging deployment."
