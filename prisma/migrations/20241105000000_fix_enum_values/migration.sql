-- Fix Enum Value Mismatches
--
-- This migration adds missing enum values to align PostgreSQL enums
-- with the Prisma schema definitions.
--
-- All changes are additive - no existing values are removed to prevent
-- data loss for any existing records.

-- ============================================
-- ErasureMethodCategory: Add missing values
-- ============================================
-- Database has: SOFTWARE_OVERWRITE, CRYPTOGRAPHIC_ERASE, SECURE_ERASE_COMMAND, BLOCK_ERASE, DEGAUSS, OTHER
-- Schema needs: CLEAR, PURGE, CRYPTO_ERASE, BLOCK_ERASE, SECURE_ERASE, SANITIZE, DEGAUSS, OTHER

DO $$
BEGIN
    -- Add CLEAR if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CLEAR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ErasureMethodCategory')) THEN
        ALTER TYPE "ErasureMethodCategory" ADD VALUE 'CLEAR';
    END IF;
END $$;

DO $$
BEGIN
    -- Add PURGE if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PURGE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ErasureMethodCategory')) THEN
        ALTER TYPE "ErasureMethodCategory" ADD VALUE 'PURGE';
    END IF;
END $$;

DO $$
BEGIN
    -- Add CRYPTO_ERASE if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CRYPTO_ERASE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ErasureMethodCategory')) THEN
        ALTER TYPE "ErasureMethodCategory" ADD VALUE 'CRYPTO_ERASE';
    END IF;
END $$;

DO $$
BEGIN
    -- Add SECURE_ERASE if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SECURE_ERASE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ErasureMethodCategory')) THEN
        ALTER TYPE "ErasureMethodCategory" ADD VALUE 'SECURE_ERASE';
    END IF;
END $$;

DO $$
BEGIN
    -- Add SANITIZE if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SANITIZE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ErasureMethodCategory')) THEN
        ALTER TYPE "ErasureMethodCategory" ADD VALUE 'SANITIZE';
    END IF;
END $$;

-- ============================================
-- MediaType: Add missing values
-- ============================================
-- Database has: HDD, SSD, NVME, USB_FLASH, SD_CARD, OPTICAL, TAPE, MEMORY_MODULE, EMBEDDED_FLASH, OTHER
-- Schema needs: HDD, SSD, NVME, USB, MEMORY_CARD, EMBEDDED, OPTICAL, TAPE, OTHER

DO $$
BEGIN
    -- Add USB if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'USB' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MediaType')) THEN
        ALTER TYPE "MediaType" ADD VALUE 'USB';
    END IF;
END $$;

DO $$
BEGIN
    -- Add MEMORY_CARD if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MEMORY_CARD' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MediaType')) THEN
        ALTER TYPE "MediaType" ADD VALUE 'MEMORY_CARD';
    END IF;
END $$;

DO $$
BEGIN
    -- Add EMBEDDED if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'EMBEDDED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'MediaType')) THEN
        ALTER TYPE "MediaType" ADD VALUE 'EMBEDDED';
    END IF;
END $$;

-- ============================================
-- EvidenceType: Add missing values
-- ============================================
-- Database has: ERASURE_LOG, ERASURE_CERTIFICATE, SCREENSHOT, PHOTO, VIDEO, WITNESS_STATEMENT, SERIAL_VERIFICATION, DESTRUCTION_PHOTO, OTHER
-- Schema needs: LOG_FILE, SCREENSHOT, REPORT, PHOTO, VIDEO, CERTIFICATE, HASH_VERIFICATION, SERIAL_CONFIRMATION, OTHER

DO $$
BEGIN
    -- Add LOG_FILE if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LOG_FILE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EvidenceType')) THEN
        ALTER TYPE "EvidenceType" ADD VALUE 'LOG_FILE';
    END IF;
END $$;

DO $$
BEGIN
    -- Add REPORT if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REPORT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EvidenceType')) THEN
        ALTER TYPE "EvidenceType" ADD VALUE 'REPORT';
    END IF;
END $$;

DO $$
BEGIN
    -- Add CERTIFICATE if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CERTIFICATE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EvidenceType')) THEN
        ALTER TYPE "EvidenceType" ADD VALUE 'CERTIFICATE';
    END IF;
END $$;

DO $$
BEGIN
    -- Add HASH_VERIFICATION if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'HASH_VERIFICATION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EvidenceType')) THEN
        ALTER TYPE "EvidenceType" ADD VALUE 'HASH_VERIFICATION';
    END IF;
END $$;

DO $$
BEGIN
    -- Add SERIAL_CONFIRMATION if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SERIAL_CONFIRMATION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EvidenceType')) THEN
        ALTER TYPE "EvidenceType" ADD VALUE 'SERIAL_CONFIRMATION';
    END IF;
END $$;

-- ============================================
-- ErasureJobStatus: Add missing values
-- ============================================
-- Database has: PENDING, IN_PROGRESS, PASSED, FAILED, PENDING_VERIFICATION, VERIFIED, REJECTED, CANCELLED
-- Schema needs: PENDING, IN_PROGRESS, PASSED, FAILED, INCONCLUSIVE, PENDING_VERIFICATION, VERIFIED, CANCELLED

DO $$
BEGIN
    -- Add INCONCLUSIVE if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INCONCLUSIVE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ErasureJobStatus')) THEN
        ALTER TYPE "ErasureJobStatus" ADD VALUE 'INCONCLUSIVE';
    END IF;
END $$;
