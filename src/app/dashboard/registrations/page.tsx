import Link from "next/link";
import {
  UserPlus,
  Building2,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  User,
} from "lucide-react";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Role, RegistrationStatus } from "@prisma/client";
import { RegistrationRowActions } from "./components/registration-row-actions";

const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

const STATUS_CONFIG: Record<
  RegistrationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  PENDING_VERIFICATION: {
    label: "Pending Verification",
    color: "bg-amber-100 text-amber-700",
    icon: <Mail className="h-3 w-3" />,
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    color: "bg-blue-100 text-blue-700",
    icon: <Clock className="h-3 w-3" />,
  },
  APPROVED: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  REJECTED: {
    label: "Rejected",
    color: "bg-rose-100 text-rose-700",
    icon: <XCircle className="h-3 w-3" />,
  },
  EXPIRED: {
    label: "Expired",
    color: "bg-slate-100 text-slate-700",
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

/**
 * Customer Registrations Page
 *
 * Admin page for reviewing and approving customer self-registrations.
 * Only accessible by OWNER and ADMIN roles.
 */
export default async function RegistrationsPage() {
  await requireMember(undefined, ADMIN_ROLES);

  // Fetch all registrations
  const registrations = await prisma.customerRegistration.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  // Group registrations by status
  const pendingApproval = registrations.filter(
    (r) => r.status === "PENDING_APPROVAL"
  );
  const pendingVerification = registrations.filter(
    (r) => r.status === "PENDING_VERIFICATION"
  );
  const approved = registrations.filter((r) => r.status === "APPROVED");
  const rejected = registrations.filter((r) => r.status === "REJECTED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Customer Registrations
          </h1>
          <p className="text-sm text-gray-500">
            Review and approve customer self-registration requests
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {pendingApproval.length}
              </p>
              <p className="text-sm text-gray-500">Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2">
              <Mail className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {pendingVerification.length}
              </p>
              <p className="text-sm text-gray-500">Awaiting Verification</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {approved.length}
              </p>
              <p className="text-sm text-gray-500">Approved</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-100 p-2">
              <XCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {rejected.length}
              </p>
              <p className="text-sm text-gray-500">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approval - Priority Section */}
      {pendingApproval.length > 0 && (
        <div className="rounded-lg border-2 border-blue-200 bg-white">
          <div className="border-b border-blue-200 bg-blue-50 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-blue-900">
              <Clock className="h-5 w-5" />
              Pending Approval ({pendingApproval.length})
            </h2>
            <p className="text-sm text-blue-700">
              These registrations have verified their email and are waiting for
              your approval.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-sm font-medium text-gray-500">
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Registered</th>
                  <th className="px-6 py-3">Verified</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingApproval.map((registration) => (
                  <tr key={registration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
                          <Building2 className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {registration.companyName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">
                          {registration.contactName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {registration.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {registration.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {registration.emailVerifiedAt
                        ? registration.emailVerifiedAt.toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <RegistrationRowActions
                        registrationId={registration.id}
                        status={registration.status}
                        companyName={registration.companyName}
                        contactName={registration.contactName}
                        email={registration.email}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Pending Message */}
      {pendingApproval.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <CheckCircle className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No pending approvals
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            All customer registrations have been reviewed.
          </p>
        </div>
      )}

      {/* Pending Verification */}
      {pendingVerification.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Mail className="h-5 w-5 text-amber-500" />
              Awaiting Email Verification ({pendingVerification.length})
            </h2>
            <p className="text-sm text-gray-500">
              These customers have registered but haven&apos;t verified their
              email yet.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-sm font-medium text-gray-500">
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Registered</th>
                  <th className="px-6 py-3">Expires</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingVerification.map((registration) => {
                  const isExpired =
                    new Date() > registration.verificationExpires;
                  return (
                    <tr
                      key={registration.id}
                      className={isExpired ? "bg-gray-50" : ""}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                            <Building2 className="h-5 w-5 text-gray-500" />
                          </div>
                          <p className="font-medium text-gray-700">
                            {registration.companyName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {registration.contactName}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {registration.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {registration.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {registration.verificationExpires.toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700">
                            <AlertCircle className="h-3 w-3" />
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                            <Clock className="h-3 w-3" />
                            Awaiting
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent History */}
      {(approved.length > 0 || rejected.length > 0) && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Calendar className="h-5 w-5 text-gray-500" />
              Recent History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-sm font-medium text-gray-500">
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Reviewed</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Reviewed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...approved, ...rejected]
                  .sort(
                    (a, b) =>
                      (b.reviewedAt?.getTime() || 0) -
                      (a.reviewedAt?.getTime() || 0)
                  )
                  .slice(0, 10)
                  .map((registration) => {
                    const config = STATUS_CONFIG[registration.status];
                    return (
                      <tr key={registration.id}>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">
                            {registration.companyName}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {registration.contactName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {registration.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {registration.reviewedAt
                            ? registration.reviewedAt.toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.color}`}
                          >
                            {config.icon}
                            {config.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {registration.reviewedByName || "—"}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
