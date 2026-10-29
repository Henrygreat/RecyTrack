import { validateInvitationToken } from "./actions";
import { AcceptInvitationForm } from "./accept-form";
import { ShieldX, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitationPage({ searchParams }: Props) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <InvalidInvitation message="No invitation token provided. Please use the link from your invitation email." />
    );
  }

  const validation = await validateInvitationToken(token);

  if (!validation.valid) {
    return <InvalidInvitation message={validation.error || "Invalid invitation"} />;
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
          maxWidth: "420px",
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-block",
              backgroundColor: "#0f766e",
              color: "white",
              fontWeight: 700,
              fontSize: "1.5rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              letterSpacing: "-0.5px",
              marginBottom: "1.5rem",
            }}
          >
            RecyTrack
          </div>

          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "#d1fae5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
            }}
          >
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>

          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#0f172a",
              margin: "0 0 0.5rem 0",
            }}
          >
            You&apos;re Invited
          </h1>

          <p style={{ color: "#64748b", margin: 0 }}>
            Join <strong style={{ color: "#0f172a" }}>{validation.invitation?.customerName}</strong> on RecyTrack
          </p>
        </div>

        {/* Form Card */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "0.75rem",
            border: "1px solid #e2e8f0",
            padding: "1.5rem",
          }}
        >
          <AcceptInvitationForm
            token={token}
            email={validation.invitation!.email}
            role={validation.invitation!.role}
            customerName={validation.invitation!.customerName}
            existingUser={validation.existingUser}
          />
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            fontSize: "0.875rem",
            color: "#94a3b8",
            marginTop: "1.5rem",
          }}
        >
          This invitation was sent by {validation.invitation?.organizationName}.
        </p>
      </div>
    </div>
  );
}

function InvalidInvitation({ message }: { message: string }) {
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
            backgroundColor: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "#0f172a",
            margin: "0 0 0.5rem 0",
          }}
        >
          Invalid Invitation
        </h1>

        <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>{message}</p>

        <Link
          href="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#0f766e",
            color: "white",
            borderRadius: "0.375rem",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
