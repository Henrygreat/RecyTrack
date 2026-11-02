-- Phase 5: Data Destruction, Certificates, and Compliance
--
-- This migration adds comprehensive data destruction tracking,
-- certificate generation, and compliance management.
--
-- All changes are additive and backward-compatible.
-- Uses idempotent patterns (IF NOT EXISTS, IF EXISTS checks).

-- ============================================
-- PHASE 5.1 ENUMS: Storage Media & Erasure
-- ============================================

-- Media Type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MediaType') THEN
        CREATE TYPE "MediaType" AS ENUM (
            'HDD', 'SSD', 'NVME', 'USB_FLASH', 'SD_CARD', 'OPTICAL',
            'TAPE', 'MEMORY_MODULE', 'EMBEDDED_FLASH', 'OTHER'
        );
    END IF;
END $$;

-- Media Sanitisation Status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MediaSanitisationStatus') THEN
        CREATE TYPE "MediaSanitisationStatus" AS ENUM (
            'NOT_STARTED', 'PENDING_ERASURE', 'ERASURE_IN_PROGRESS',
            'ERASURE_PASSED', 'ERASURE_FAILED', 'PENDING_DESTRUCTION',
            'DESTRUCTION_IN_PROGRESS', 'DESTROYED', 'VERIFIED', 'EXEMPT'
        );
    END IF;
END $$;

-- Erasure Method Category enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ErasureMethodCategory') THEN
        CREATE TYPE "ErasureMethodCategory" AS ENUM (
            'SOFTWARE_OVERWRITE', 'CRYPTOGRAPHIC_ERASE',
            'SECURE_ERASE_COMMAND', 'BLOCK_ERASE', 'DEGAUSS', 'OTHER'
        );
    END IF;
END $$;

-- Erasure Job Status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ErasureJobStatus') THEN
        CREATE TYPE "ErasureJobStatus" AS ENUM (
            'PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED',
            'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'CANCELLED'
        );
    END IF;
END $$;

-- Evidence Type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EvidenceType') THEN
        CREATE TYPE "EvidenceType" AS ENUM (
            'ERASURE_LOG', 'ERASURE_CERTIFICATE', 'SCREENSHOT',
            'PHOTO', 'VIDEO', 'WITNESS_STATEMENT', 'SERIAL_VERIFICATION',
            'DESTRUCTION_PHOTO', 'OTHER'
        );
    END IF;
END $$;

-- ============================================
-- PHASE 5.2 ENUMS: Physical Destruction
-- ============================================

-- Destruction Method enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DestructionMethod') THEN
        CREATE TYPE "DestructionMethod" AS ENUM (
            'SHRED', 'CRUSH', 'DEGAUSS', 'INCINERATE', 'DISINTEGRATE',
            'MELT', 'PULVERISE', 'DRILL', 'OTHER'
        );
    END IF;
END $$;

-- Destruction Status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DestructionStatus') THEN
        CREATE TYPE "DestructionStatus" AS ENUM (
            'SCHEDULED', 'IN_PROGRESS', 'COMPLETED',
            'PENDING_VERIFICATION', 'VERIFIED', 'CANCELLED'
        );
    END IF;
END $$;

-- ============================================
-- PHASE 5.3 ENUMS: Certificates
-- ============================================

-- Certificate Type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CertificateType') THEN
        CREATE TYPE "CertificateType" AS ENUM (
            'DATA_ERASURE', 'PHYSICAL_DESTRUCTION', 'BATCH'
        );
    END IF;
END $$;

-- Certificate Status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CertificateStatus') THEN
        CREATE TYPE "CertificateStatus" AS ENUM (
            'DRAFT', 'PENDING_APPROVAL', 'ISSUED', 'REVOKED', 'SUPERSEDED'
        );
    END IF;
END $$;

-- ============================================
-- PHASE 5.4 ENUMS: Compliance
-- ============================================

-- Compliance Policy Status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CompliancePolicyStatus') THEN
        CREATE TYPE "CompliancePolicyStatus" AS ENUM (
            'DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'ARCHIVED', 'SUPERSEDED'
        );
    END IF;
END $$;

-- Compliance Exception Severity enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComplianceExceptionSeverity') THEN
        CREATE TYPE "ComplianceExceptionSeverity" AS ENUM (
            'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        );
    END IF;
END $$;

-- Compliance Exception Status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComplianceExceptionStatus') THEN
        CREATE TYPE "ComplianceExceptionStatus" AS ENUM (
            'OPEN', 'INVESTIGATING', 'PENDING_ACTION',
            'RESOLVED', 'CLOSED', 'ESCALATED'
        );
    END IF;
END $$;

-- Compliance Exception Category enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ComplianceExceptionCategory') THEN
        CREATE TYPE "ComplianceExceptionCategory" AS ENUM (
            'ERASURE_FAILURE', 'MISSING_MEDIA', 'SERIAL_MISMATCH',
            'MISSING_EVIDENCE', 'UNAPPROVED_METHOD', 'UNVERIFIED_DESTRUCTION',
            'OVERDUE_APPROVAL', 'CERTIFICATE_ERROR', 'EXPIRED_POLICY',
            'CUSTODY_DISCREPANCY', 'OTHER'
        );
    END IF;
END $$;

-- Audit Status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditStatus') THEN
        CREATE TYPE "AuditStatus" AS ENUM (
            'PLANNED', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED'
        );
    END IF;
END $$;

-- Audit Finding Severity enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditFindingSeverity') THEN
        CREATE TYPE "AuditFindingSeverity" AS ENUM (
            'OBSERVATION', 'MINOR', 'MAJOR', 'CRITICAL'
        );
    END IF;
END $$;

-- Audit Finding Status enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditFindingStatus') THEN
        CREATE TYPE "AuditFindingStatus" AS ENUM (
            'OPEN', 'CORRECTIVE_ACTION_REQUIRED', 'ACTION_IN_PROGRESS',
            'PENDING_VERIFICATION', 'CLOSED'
        );
    END IF;
END $$;

-- ============================================
-- PHASE 5.1: STORAGE MEDIA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "StorageMedia" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "capacity" TEXT,
    "interface" TEXT,
    "warehouseLocationId" TEXT,
    "binLocation" TEXT,
    "isDataBearing" BOOLEAN NOT NULL DEFAULT true,
    "containsSensitiveData" BOOLEAN NOT NULL DEFAULT false,
    "dataClassification" TEXT,
    "sanitisationStatus" "MediaSanitisationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "sanitisationMethod" TEXT,
    "isRemovable" BOOLEAN NOT NULL DEFAULT false,
    "isIndependent" BOOLEAN NOT NULL DEFAULT false,
    "detachedAt" TIMESTAMP(3),
    "detachedByUserId" TEXT,
    "detachedByName" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "verifiedByName" TEXT,
    "verificationNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "StorageMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StorageMedia_organizationId_reference_key"
    ON "StorageMedia"("organizationId", "reference");
CREATE UNIQUE INDEX IF NOT EXISTS "StorageMedia_id_organizationId_key"
    ON "StorageMedia"("id", "organizationId");
CREATE INDEX IF NOT EXISTS "StorageMedia_assetId_idx"
    ON "StorageMedia"("assetId");
CREATE INDEX IF NOT EXISTS "StorageMedia_organizationId_sanitisationStatus_idx"
    ON "StorageMedia"("organizationId", "sanitisationStatus");
CREATE INDEX IF NOT EXISTS "StorageMedia_organizationId_mediaType_idx"
    ON "StorageMedia"("organizationId", "mediaType");
CREATE INDEX IF NOT EXISTS "StorageMedia_serialNumber_idx"
    ON "StorageMedia"("serialNumber");
CREATE INDEX IF NOT EXISTS "StorageMedia_warehouseLocationId_idx"
    ON "StorageMedia"("warehouseLocationId");

-- ============================================
-- PHASE 5.1: ERASURE METHOD TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "ErasureMethod" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "category" "ErasureMethodCategory" NOT NULL,
    "supportedMediaTypes" "MediaType"[],
    "toolName" TEXT,
    "toolVersion" TEXT,
    "procedureRef" TEXT,
    "requiresEvidence" BOOLEAN NOT NULL DEFAULT true,
    "requiredEvidenceTypes" "EvidenceType"[],
    "requiresVerification" BOOLEAN NOT NULL DEFAULT true,
    "complianceStandards" TEXT[],
    "verificationMethod" TEXT,
    "verificationCriteria" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "ErasureMethod_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ErasureMethod_organizationId_code_key"
    ON "ErasureMethod"("organizationId", "code");
CREATE INDEX IF NOT EXISTS "ErasureMethod_organizationId_isActive_idx"
    ON "ErasureMethod"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "ErasureMethod_organizationId_category_idx"
    ON "ErasureMethod"("organizationId", "category");

-- ============================================
-- PHASE 5.1: ERASURE JOB TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "ErasureJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "storageMediaId" TEXT NOT NULL,
    "erasureMethodId" TEXT,
    "methodName" TEXT NOT NULL,
    "methodCode" TEXT NOT NULL,
    "methodCategory" "ErasureMethodCategory" NOT NULL,
    "toolUsed" TEXT,
    "toolVersion" TEXT,
    "procedureFollowed" TEXT,
    "assignedTechnicianUserId" TEXT,
    "assignedTechnicianName" TEXT,
    "assignedAt" TIMESTAMP(3),
    "status" "ErasureJobStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "executionNotes" TEXT,
    "passCount" INTEGER,
    "outcome" TEXT,
    "failureReason" TEXT,
    "failureCategory" TEXT,
    "verificationStatus" TEXT,
    "verificationMethod" TEXT,
    "verificationResult" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "verifiedByName" TEXT,
    "supervisorApprovalRequired" BOOLEAN NOT NULL DEFAULT true,
    "supervisorApprovedAt" TIMESTAMP(3),
    "supervisorApprovedByUserId" TEXT,
    "supervisorApprovedByName" TEXT,
    "supervisorNotes" TEXT,
    "previousJobId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "retryReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "ErasureJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ErasureJob_organizationId_reference_key"
    ON "ErasureJob"("organizationId", "reference");
CREATE INDEX IF NOT EXISTS "ErasureJob_storageMediaId_idx"
    ON "ErasureJob"("storageMediaId");
CREATE INDEX IF NOT EXISTS "ErasureJob_organizationId_status_idx"
    ON "ErasureJob"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "ErasureJob_assignedTechnicianUserId_idx"
    ON "ErasureJob"("assignedTechnicianUserId");
CREATE INDEX IF NOT EXISTS "ErasureJob_organizationId_createdAt_idx"
    ON "ErasureJob"("organizationId", "createdAt");

-- ============================================
-- PHASE 5.1: ERASURE EVIDENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "ErasureEvidence" (
    "id" TEXT NOT NULL,
    "erasureJobId" TEXT NOT NULL,
    "evidenceType" "EvidenceType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "fileHash" TEXT,
    "hashAlgorithm" TEXT,
    "description" TEXT,
    "capturedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,

    CONSTRAINT "ErasureEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ErasureEvidence_erasureJobId_idx"
    ON "ErasureEvidence"("erasureJobId");
CREATE INDEX IF NOT EXISTS "ErasureEvidence_evidenceType_idx"
    ON "ErasureEvidence"("evidenceType");

-- ============================================
-- PHASE 5.2: DESTRUCTION JOB TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "DestructionJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "storageMediaId" TEXT NOT NULL,
    "destructionReason" TEXT NOT NULL,
    "reasonCategory" TEXT,
    "destructionMethod" "DestructionMethod" NOT NULL,
    "methodDescription" TEXT,
    "equipmentUsed" TEXT,
    "status" "DestructionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledDate" TIMESTAMP(3),
    "scheduledByUserId" TEXT,
    "scheduledByName" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "performedByUserId" TEXT,
    "performedByName" TEXT,
    "destructionLocation" TEXT,
    "executionNotes" TEXT,
    "requiresWitness" BOOLEAN NOT NULL DEFAULT true,
    "witnessCount" INTEGER NOT NULL DEFAULT 1,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "verifiedByName" TEXT,
    "verificationNotes" TEXT,
    "serialNumberConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "serialConfirmedAt" TIMESTAMP(3),
    "serialConfirmedByUserId" TEXT,
    "serialConfirmedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "DestructionJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DestructionJob_organizationId_reference_key"
    ON "DestructionJob"("organizationId", "reference");
CREATE UNIQUE INDEX IF NOT EXISTS "DestructionJob_storageMediaId_key"
    ON "DestructionJob"("storageMediaId");
CREATE INDEX IF NOT EXISTS "DestructionJob_organizationId_status_idx"
    ON "DestructionJob"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "DestructionJob_organizationId_scheduledDate_idx"
    ON "DestructionJob"("organizationId", "scheduledDate");
CREATE INDEX IF NOT EXISTS "DestructionJob_performedByUserId_idx"
    ON "DestructionJob"("performedByUserId");

-- ============================================
-- PHASE 5.2: DESTRUCTION WITNESS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "DestructionWitness" (
    "id" TEXT NOT NULL,
    "destructionJobId" TEXT NOT NULL,
    "witnessUserId" TEXT,
    "witnessName" TEXT NOT NULL,
    "witnessRole" TEXT,
    "witnessEmail" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "signatureData" TEXT,
    "witnessStatement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestructionWitness_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DestructionWitness_destructionJobId_idx"
    ON "DestructionWitness"("destructionJobId");
CREATE INDEX IF NOT EXISTS "DestructionWitness_witnessUserId_idx"
    ON "DestructionWitness"("witnessUserId");

-- ============================================
-- PHASE 5.2: DESTRUCTION EVIDENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "DestructionEvidence" (
    "id" TEXT NOT NULL,
    "destructionJobId" TEXT NOT NULL,
    "evidenceType" "EvidenceType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "fileHash" TEXT,
    "hashAlgorithm" TEXT,
    "description" TEXT,
    "capturedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,

    CONSTRAINT "DestructionEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DestructionEvidence_destructionJobId_idx"
    ON "DestructionEvidence"("destructionJobId");
CREATE INDEX IF NOT EXISTS "DestructionEvidence_evidenceType_idx"
    ON "DestructionEvidence"("evidenceType");

-- ============================================
-- PHASE 5.3: CERTIFICATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "Certificate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "certificateType" "CertificateType" NOT NULL,
    "status" "CertificateStatus" NOT NULL DEFAULT 'DRAFT',
    "customerId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "issuedByUserId" TEXT,
    "issuedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedByName" TEXT,
    "approvalNotes" TEXT,
    "processingStartDate" TIMESTAMP(3),
    "processingCompleteDate" TIMESTAMP(3),
    "totalMediaCount" INTEGER NOT NULL DEFAULT 0,
    "sanitisationSummary" TEXT,
    "pdfUrl" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "documentChecksum" TEXT,
    "templateVersion" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedByUserId" TEXT,
    "revokedByName" TEXT,
    "revocationReason" TEXT,
    "supersededById" TEXT,
    "supersededAt" TIMESTAMP(3),
    "supersessionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_organizationId_reference_key"
    ON "Certificate"("organizationId", "reference");
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_organizationId_certificateNumber_key"
    ON "Certificate"("organizationId", "certificateNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_verificationToken_key"
    ON "Certificate"("verificationToken");
CREATE INDEX IF NOT EXISTS "Certificate_customerId_idx"
    ON "Certificate"("customerId");
CREATE INDEX IF NOT EXISTS "Certificate_organizationId_status_idx"
    ON "Certificate"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Certificate_organizationId_certificateType_idx"
    ON "Certificate"("organizationId", "certificateType");
CREATE INDEX IF NOT EXISTS "Certificate_verificationToken_idx"
    ON "Certificate"("verificationToken");
CREATE INDEX IF NOT EXISTS "Certificate_organizationId_issueDate_idx"
    ON "Certificate"("organizationId", "issueDate");

-- ============================================
-- PHASE 5.3: CERTIFICATE ITEM TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CertificateItem" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "storageMediaId" TEXT NOT NULL,
    "erasureJobId" TEXT,
    "destructionJobId" TEXT,
    "mediaReference" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "serialNumber" TEXT,
    "assetTag" TEXT NOT NULL,
    "processingType" TEXT NOT NULL,
    "processingMethod" TEXT NOT NULL,
    "processingDate" TIMESTAMP(3) NOT NULL,
    "outcomeStatus" TEXT NOT NULL,
    "verifiedByName" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CertificateItem_certificateId_idx"
    ON "CertificateItem"("certificateId");
CREATE INDEX IF NOT EXISTS "CertificateItem_storageMediaId_idx"
    ON "CertificateItem"("storageMediaId");

-- ============================================
-- PHASE 5.3: CERTIFICATE EVENT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CertificateEvent" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorName" TEXT,
    "actorIp" TEXT,
    "details" JSONB,
    "notes" TEXT,

    CONSTRAINT "CertificateEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CertificateEvent_certificateId_idx"
    ON "CertificateEvent"("certificateId");
CREATE INDEX IF NOT EXISTS "CertificateEvent_eventType_idx"
    ON "CertificateEvent"("eventType");
CREATE INDEX IF NOT EXISTS "CertificateEvent_eventDate_idx"
    ON "CertificateEvent"("eventDate");

-- ============================================
-- PHASE 5.3: CERTIFICATE VERIFICATION LOG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CertificateVerificationLog" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifierIp" TEXT,
    "userAgent" TEXT,
    "verificationResult" TEXT NOT NULL,

    CONSTRAINT "CertificateVerificationLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CertificateVerificationLog_certificateId_idx"
    ON "CertificateVerificationLog"("certificateId");
CREATE INDEX IF NOT EXISTS "CertificateVerificationLog_verifiedAt_idx"
    ON "CertificateVerificationLog"("verifiedAt");

-- ============================================
-- PHASE 5.4: COMPLIANCE POLICY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "CompliancePolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "previousVersionId" TEXT,
    "status" "CompliancePolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerUserId" TEXT,
    "ownerName" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "policyContent" TEXT,
    "documentUrl" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedByName" TEXT,
    "approvedErasureMethods" TEXT[],
    "approvedDestructionMethods" TEXT[],
    "complianceStandards" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "CompliancePolicy_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompliancePolicy_organizationId_reference_version_key"
    ON "CompliancePolicy"("organizationId", "reference", "version");
CREATE INDEX IF NOT EXISTS "CompliancePolicy_organizationId_status_idx"
    ON "CompliancePolicy"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "CompliancePolicy_organizationId_reviewDate_idx"
    ON "CompliancePolicy"("organizationId", "reviewDate");

-- ============================================
-- PHASE 5.4: COMPLIANCE EXCEPTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "ComplianceException" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ComplianceExceptionCategory" NOT NULL,
    "severity" "ComplianceExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ComplianceExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "assetId" TEXT,
    "storageMediaId" TEXT,
    "erasureJobId" TEXT,
    "destructionJobId" TEXT,
    "certificateId" TEXT,
    "customerId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedByUserId" TEXT,
    "detectedByName" TEXT,
    "assignedToUserId" TEXT,
    "assignedToName" TEXT,
    "investigationNotes" TEXT,
    "investigatedByUserId" TEXT,
    "investigatedByName" TEXT,
    "correctiveAction" TEXT,
    "correctiveActionDue" TIMESTAMP(3),
    "correctiveActionTaken" TEXT,
    "correctiveCompletedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedByName" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "evidenceUrl" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "escalatedToUserId" TEXT,
    "escalatedToName" TEXT,
    "escalationReason" TEXT,
    "isBlocking" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceException_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ComplianceException_organizationId_reference_key"
    ON "ComplianceException"("organizationId", "reference");
CREATE INDEX IF NOT EXISTS "ComplianceException_organizationId_status_idx"
    ON "ComplianceException"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "ComplianceException_organizationId_severity_idx"
    ON "ComplianceException"("organizationId", "severity");
CREATE INDEX IF NOT EXISTS "ComplianceException_organizationId_category_idx"
    ON "ComplianceException"("organizationId", "category");
CREATE INDEX IF NOT EXISTS "ComplianceException_assignedToUserId_idx"
    ON "ComplianceException"("assignedToUserId");
CREATE INDEX IF NOT EXISTS "ComplianceException_storageMediaId_idx"
    ON "ComplianceException"("storageMediaId");
CREATE INDEX IF NOT EXISTS "ComplianceException_erasureJobId_idx"
    ON "ComplianceException"("erasureJobId");
CREATE INDEX IF NOT EXISTS "ComplianceException_destructionJobId_idx"
    ON "ComplianceException"("destructionJobId");

-- ============================================
-- PHASE 5.4: COMPLIANCE AUDIT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "ComplianceAudit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "auditType" TEXT,
    "scope" TEXT,
    "customerId" TEXT,
    "status" "AuditStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedStartDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "auditorUserId" TEXT,
    "auditorName" TEXT,
    "auditorEmail" TEXT,
    "externalAuditor" BOOLEAN NOT NULL DEFAULT false,
    "auditorOrganization" TEXT,
    "totalFindings" INTEGER NOT NULL DEFAULT 0,
    "criticalFindings" INTEGER NOT NULL DEFAULT 0,
    "majorFindings" INTEGER NOT NULL DEFAULT 0,
    "minorFindings" INTEGER NOT NULL DEFAULT 0,
    "observations" INTEGER NOT NULL DEFAULT 0,
    "reviewedByUserId" TEXT,
    "reviewedByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "closedByUserId" TEXT,
    "closedByName" TEXT,
    "closedAt" TIMESTAMP(3),
    "closureNotes" TEXT,
    "reportUrl" TEXT,
    "evidencePackageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "ComplianceAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ComplianceAudit_organizationId_reference_key"
    ON "ComplianceAudit"("organizationId", "reference");
CREATE INDEX IF NOT EXISTS "ComplianceAudit_organizationId_status_idx"
    ON "ComplianceAudit"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "ComplianceAudit_auditorUserId_idx"
    ON "ComplianceAudit"("auditorUserId");
CREATE INDEX IF NOT EXISTS "ComplianceAudit_customerId_idx"
    ON "ComplianceAudit"("customerId");

-- ============================================
-- PHASE 5.4: AUDIT FINDING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "AuditFinding" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "AuditFindingSeverity" NOT NULL,
    "status" "AuditFindingStatus" NOT NULL DEFAULT 'OPEN',
    "area" TEXT,
    "requirement" TEXT,
    "correctiveActionRequired" TEXT,
    "correctiveActionDue" TIMESTAMP(3),
    "correctiveActionTaken" TEXT,
    "actionTakenByUserId" TEXT,
    "actionTakenByName" TEXT,
    "actionTakenAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "verifiedByName" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "closedByUserId" TEXT,
    "closedByName" TEXT,
    "closedAt" TIMESTAMP(3),
    "closureNotes" TEXT,
    "evidenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuditFinding_auditId_reference_key"
    ON "AuditFinding"("auditId", "reference");
CREATE INDEX IF NOT EXISTS "AuditFinding_auditId_idx"
    ON "AuditFinding"("auditId");
CREATE INDEX IF NOT EXISTS "AuditFinding_severity_idx"
    ON "AuditFinding"("severity");
CREATE INDEX IF NOT EXISTS "AuditFinding_status_idx"
    ON "AuditFinding"("status");

-- ============================================
-- PHASE 5.4: COMPLIANCE EVIDENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "ComplianceEvidence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assetId" TEXT,
    "storageMediaId" TEXT,
    "erasureJobId" TEXT,
    "destructionJobId" TEXT,
    "certificateId" TEXT,
    "auditId" TEXT,
    "policyId" TEXT,
    "exceptionId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "fileHash" TEXT,
    "hashAlgorithm" TEXT,
    "isRestricted" BOOLEAN NOT NULL DEFAULT false,
    "accessLevel" TEXT,
    "retentionYears" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" TEXT,
    "uploadedByName" TEXT,

    CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ComplianceEvidence_organizationId_category_idx"
    ON "ComplianceEvidence"("organizationId", "category");
CREATE INDEX IF NOT EXISTS "ComplianceEvidence_storageMediaId_idx"
    ON "ComplianceEvidence"("storageMediaId");
CREATE INDEX IF NOT EXISTS "ComplianceEvidence_erasureJobId_idx"
    ON "ComplianceEvidence"("erasureJobId");
CREATE INDEX IF NOT EXISTS "ComplianceEvidence_destructionJobId_idx"
    ON "ComplianceEvidence"("destructionJobId");
CREATE INDEX IF NOT EXISTS "ComplianceEvidence_certificateId_idx"
    ON "ComplianceEvidence"("certificateId");
CREATE INDEX IF NOT EXISTS "ComplianceEvidence_auditId_idx"
    ON "ComplianceEvidence"("auditId");

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

-- StorageMedia foreign keys
ALTER TABLE "StorageMedia" DROP CONSTRAINT IF EXISTS "StorageMedia_organizationId_fkey";
ALTER TABLE "StorageMedia" ADD CONSTRAINT "StorageMedia_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StorageMedia" DROP CONSTRAINT IF EXISTS "StorageMedia_assetId_organizationId_fkey";
ALTER TABLE "StorageMedia" ADD CONSTRAINT "StorageMedia_assetId_organizationId_fkey"
    FOREIGN KEY ("assetId", "organizationId") REFERENCES "Asset"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StorageMedia" DROP CONSTRAINT IF EXISTS "StorageMedia_warehouseLocationId_organizationId_fkey";
ALTER TABLE "StorageMedia" ADD CONSTRAINT "StorageMedia_warehouseLocationId_organizationId_fkey"
    FOREIGN KEY ("warehouseLocationId", "organizationId") REFERENCES "WarehouseLocation"("id", "organizationId") ON DELETE SET NULL ON UPDATE CASCADE;

-- ErasureMethod foreign keys
ALTER TABLE "ErasureMethod" DROP CONSTRAINT IF EXISTS "ErasureMethod_organizationId_fkey";
ALTER TABLE "ErasureMethod" ADD CONSTRAINT "ErasureMethod_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ErasureJob foreign keys
ALTER TABLE "ErasureJob" DROP CONSTRAINT IF EXISTS "ErasureJob_organizationId_fkey";
ALTER TABLE "ErasureJob" ADD CONSTRAINT "ErasureJob_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ErasureJob" DROP CONSTRAINT IF EXISTS "ErasureJob_storageMediaId_fkey";
ALTER TABLE "ErasureJob" ADD CONSTRAINT "ErasureJob_storageMediaId_fkey"
    FOREIGN KEY ("storageMediaId") REFERENCES "StorageMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ErasureJob" DROP CONSTRAINT IF EXISTS "ErasureJob_erasureMethodId_fkey";
ALTER TABLE "ErasureJob" ADD CONSTRAINT "ErasureJob_erasureMethodId_fkey"
    FOREIGN KEY ("erasureMethodId") REFERENCES "ErasureMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ErasureEvidence foreign keys
ALTER TABLE "ErasureEvidence" DROP CONSTRAINT IF EXISTS "ErasureEvidence_erasureJobId_fkey";
ALTER TABLE "ErasureEvidence" ADD CONSTRAINT "ErasureEvidence_erasureJobId_fkey"
    FOREIGN KEY ("erasureJobId") REFERENCES "ErasureJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DestructionJob foreign keys
ALTER TABLE "DestructionJob" DROP CONSTRAINT IF EXISTS "DestructionJob_organizationId_fkey";
ALTER TABLE "DestructionJob" ADD CONSTRAINT "DestructionJob_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DestructionJob" DROP CONSTRAINT IF EXISTS "DestructionJob_storageMediaId_fkey";
ALTER TABLE "DestructionJob" ADD CONSTRAINT "DestructionJob_storageMediaId_fkey"
    FOREIGN KEY ("storageMediaId") REFERENCES "StorageMedia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DestructionWitness foreign keys
ALTER TABLE "DestructionWitness" DROP CONSTRAINT IF EXISTS "DestructionWitness_destructionJobId_fkey";
ALTER TABLE "DestructionWitness" ADD CONSTRAINT "DestructionWitness_destructionJobId_fkey"
    FOREIGN KEY ("destructionJobId") REFERENCES "DestructionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DestructionEvidence foreign keys
ALTER TABLE "DestructionEvidence" DROP CONSTRAINT IF EXISTS "DestructionEvidence_destructionJobId_fkey";
ALTER TABLE "DestructionEvidence" ADD CONSTRAINT "DestructionEvidence_destructionJobId_fkey"
    FOREIGN KEY ("destructionJobId") REFERENCES "DestructionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Certificate foreign keys
ALTER TABLE "Certificate" DROP CONSTRAINT IF EXISTS "Certificate_organizationId_fkey";
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Certificate" DROP CONSTRAINT IF EXISTS "Certificate_customerId_organizationId_fkey";
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_customerId_organizationId_fkey"
    FOREIGN KEY ("customerId", "organizationId") REFERENCES "Customer"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CertificateItem foreign keys
ALTER TABLE "CertificateItem" DROP CONSTRAINT IF EXISTS "CertificateItem_certificateId_fkey";
ALTER TABLE "CertificateItem" ADD CONSTRAINT "CertificateItem_certificateId_fkey"
    FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CertificateItem" DROP CONSTRAINT IF EXISTS "CertificateItem_storageMediaId_fkey";
ALTER TABLE "CertificateItem" ADD CONSTRAINT "CertificateItem_storageMediaId_fkey"
    FOREIGN KEY ("storageMediaId") REFERENCES "StorageMedia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CertificateEvent foreign keys
ALTER TABLE "CertificateEvent" DROP CONSTRAINT IF EXISTS "CertificateEvent_certificateId_fkey";
ALTER TABLE "CertificateEvent" ADD CONSTRAINT "CertificateEvent_certificateId_fkey"
    FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CertificateVerificationLog foreign keys
ALTER TABLE "CertificateVerificationLog" DROP CONSTRAINT IF EXISTS "CertificateVerificationLog_certificateId_fkey";
ALTER TABLE "CertificateVerificationLog" ADD CONSTRAINT "CertificateVerificationLog_certificateId_fkey"
    FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CompliancePolicy foreign keys
ALTER TABLE "CompliancePolicy" DROP CONSTRAINT IF EXISTS "CompliancePolicy_organizationId_fkey";
ALTER TABLE "CompliancePolicy" ADD CONSTRAINT "CompliancePolicy_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ComplianceException foreign keys
ALTER TABLE "ComplianceException" DROP CONSTRAINT IF EXISTS "ComplianceException_organizationId_fkey";
ALTER TABLE "ComplianceException" ADD CONSTRAINT "ComplianceException_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ComplianceAudit foreign keys
ALTER TABLE "ComplianceAudit" DROP CONSTRAINT IF EXISTS "ComplianceAudit_organizationId_fkey";
ALTER TABLE "ComplianceAudit" ADD CONSTRAINT "ComplianceAudit_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AuditFinding foreign keys
ALTER TABLE "AuditFinding" DROP CONSTRAINT IF EXISTS "AuditFinding_auditId_fkey";
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_auditId_fkey"
    FOREIGN KEY ("auditId") REFERENCES "ComplianceAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ComplianceEvidence foreign keys
ALTER TABLE "ComplianceEvidence" DROP CONSTRAINT IF EXISTS "ComplianceEvidence_organizationId_fkey";
ALTER TABLE "ComplianceEvidence" ADD CONSTRAINT "ComplianceEvidence_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
