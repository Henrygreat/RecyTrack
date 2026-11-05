import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember } from "@/lib/access";
import { Role } from "@prisma/client";
import { InviteStaffForm } from "./invite-form";

const ADMIN_ROLES: Role[] = ["OWNER", "ADMIN"];

export default async function InviteStaffPage() {
  const { membership } = await requireMember(undefined, ADMIN_ROLES);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/users"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Users
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invite Staff Member</h1>
        <p className="text-sm text-gray-500">
          Send an invitation to join your organization
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <InviteStaffForm currentUserRole={membership.role} />
      </div>

      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900">About Staff Roles</h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-700">
          <li><strong>Administrator:</strong> Full access to all features including user management</li>
          <li><strong>Operations Manager:</strong> Manage collections, customers, and daily operations</li>
          <li><strong>Warehouse Staff:</strong> Process assets, inspections, and warehouse tasks</li>
          <li><strong>Driver:</strong> View and update assigned collections only</li>
        </ul>
      </div>
    </div>
  );
}
