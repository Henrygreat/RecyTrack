import Link from "next/link";
import { ShieldX, ArrowLeft, Mail, LayoutDashboard } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function PortalNoAccess() {
  const session = await auth();

  // Check if user is a staff member (has Membership)
  let isStaff = false;
  if (session?.user?.id) {
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    isStaff = !!membership;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: isStaff ? "#fef3c7" : "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <ShieldX className={`w-8 h-8 ${isStaff ? "text-amber-500" : "text-red-500"}`} />
        </div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#0f172a",
            margin: "0 0 0.5rem 0",
          }}
        >
          {isStaff ? "Portal Preview Access Required" : "No Portal Access"}
        </h1>

        <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
          {isStaff
            ? `To preview the customer portal, you need a CustomerAccess record. This can be created from the customer management page.`
            : `Your account (${session?.user?.email}) does not have access to any customer portals.`}
        </p>

        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f1f5f9",
            borderRadius: "0.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "#475569", margin: 0 }}>
            {isStaff
              ? "To grant yourself portal preview access, go to Customers > Select Customer > Access tab > Invite User, and add your email address."
              : "If you believe this is an error, please contact your account administrator or the recycling company to request access."}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {isStaff ? (
            <>
              <Link
                href="/dashboard"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#0f766e",
                  color: "white",
                  borderRadius: "0.375rem",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Operations Dashboard
              </Link>
              <Link
                href="/dashboard/customers"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  color: "#334155",
                  borderRadius: "0.375rem",
                  textDecoration: "none",
                }}
              >
                Manage Customers
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#0f766e",
                  color: "white",
                  borderRadius: "0.375rem",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>

              <a
                href="mailto:support@example.com"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  color: "#334155",
                  borderRadius: "0.375rem",
                  textDecoration: "none",
                }}
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
