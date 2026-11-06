-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING_VERIFICATION', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "CustomerRegistration" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "verificationExpires" TIMESTAMP(3) NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewedByName" TEXT,
    "rejectionReason" TEXT,
    "createdCustomerId" TEXT,
    "createdUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "emailMessageId" TEXT,
    "emailDeliveredAt" TIMESTAMP(3),
    "emailFailedAt" TIMESTAMP(3),
    "emailFailureReason" TEXT,
    "lastResendAt" TIMESTAMP(3),
    "resendCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomerRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRegistration_email_key" ON "CustomerRegistration"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerRegistration_verificationToken_key" ON "CustomerRegistration"("verificationToken");

-- CreateIndex
CREATE INDEX "CustomerRegistration_email_idx" ON "CustomerRegistration"("email");

-- CreateIndex
CREATE INDEX "CustomerRegistration_verificationToken_idx" ON "CustomerRegistration"("verificationToken");

-- CreateIndex
CREATE INDEX "CustomerRegistration_status_idx" ON "CustomerRegistration"("status");

-- CreateIndex
CREATE INDEX "CustomerRegistration_createdAt_idx" ON "CustomerRegistration"("createdAt");
