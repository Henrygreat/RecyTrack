import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  Recycle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Mail,
} from "lucide-react";

/**
 * Email Verification Page
 *
 * Handles email verification tokens from registration flow.
 * Updates registration status from PENDING_VERIFICATION to PENDING_APPROVAL.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  // No token provided
  if (!token) {
    return (
      <VerificationResult
        status="error"
        title="Invalid verification link"
        message="The verification link is invalid or missing. Please check your email and try again."
      />
    );
  }

  // Find the registration with this token
  const registration = await prisma.customerRegistration.findUnique({
    where: { verificationToken: token },
  });

  // Token not found
  if (!registration) {
    return (
      <VerificationResult
        status="error"
        title="Verification link not found"
        message="This verification link is invalid or has already been used. Please check your email or contact support."
      />
    );
  }

  // Already verified
  if (registration.emailVerifiedAt) {
    if (registration.status === "PENDING_APPROVAL") {
      return (
        <VerificationResult
          status="pending"
          title="Email already verified"
          message="Your email has already been verified. Your registration is pending admin approval. You'll receive an email once your account is approved."
        />
      );
    }
    if (registration.status === "APPROVED") {
      redirect("/login");
    }
    if (registration.status === "REJECTED") {
      return (
        <VerificationResult
          status="error"
          title="Registration rejected"
          message="Your registration was not approved. Please contact support for assistance."
        />
      );
    }
  }

  // Token expired
  if (new Date() > registration.verificationExpires) {
    return (
      <VerificationResult
        status="expired"
        title="Verification link expired"
        message="This verification link has expired. Please register again to receive a new verification email."
      />
    );
  }

  // Verify the email
  try {
    await prisma.customerRegistration.update({
      where: { id: registration.id },
      data: {
        emailVerifiedAt: new Date(),
        status: "PENDING_APPROVAL",
      },
    });

    return (
      <VerificationResult
        status="success"
        title="Email verified successfully!"
        message="Thank you for verifying your email. Your registration is now pending admin approval. You'll receive an email once your account is approved."
        email={registration.email}
        companyName={registration.companyName}
      />
    );
  } catch (error) {
    console.error("Failed to verify email:", error);
    return (
      <VerificationResult
        status="error"
        title="Verification failed"
        message="An error occurred while verifying your email. Please try again later or contact support."
      />
    );
  }
}

/**
 * Verification Result Component
 */
function VerificationResult({
  status,
  title,
  message,
  email,
  companyName,
}: {
  status: "success" | "error" | "expired" | "pending";
  title: string;
  message: string;
  email?: string;
  companyName?: string;
}) {
  const statusConfig = {
    success: {
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    error: {
      icon: XCircle,
      iconColor: "text-rose-600",
      bgColor: "bg-rose-50",
    },
    expired: {
      icon: Clock,
      iconColor: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    pending: {
      icon: Mail,
      iconColor: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
            <Recycle className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900">
            Recy<span className="text-teal-600">Track</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center`}
            >
              <Icon className={`w-8 h-8 ${config.iconColor}`} />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-3">{title}</h1>
            <p className="text-slate-500">{message}</p>
          </div>

          {/* Additional Info for Success */}
          {status === "success" && email && companyName && (
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Company:</span>
                  <span className="text-slate-900 font-medium">
                    {companyName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-900 font-medium">{email}</span>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps for Success/Pending */}
          {(status === "success" || status === "pending") && (
            <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 mb-6">
              <p className="text-sm text-teal-700">
                <strong>What&apos;s next?</strong> Our team will review your
                registration and send you an email once your account is
                approved. This usually takes 1-2 business days.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {status === "expired" && (
              <Link
                href="/register"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Register Again
              </Link>
            )}

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
