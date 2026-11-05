import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMember, MANAGEMENT_ROLES } from "@/lib/access";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PolicyForm } from "../components/policy-form";

export default async function NewPolicy() {
  // Require management role to create policies
  await requireMember(undefined, MANAGEMENT_ROLES);

  return (
    <>
      <Link
        href="/dashboard/compliance/policies"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          color: "#64748b",
          fontSize: "0.875rem",
          marginBottom: "1rem",
          textDecoration: "none",
        }}
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Policies
      </Link>

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#0f172a", margin: 0 }}>
          Create Compliance Policy
        </h1>
        <p style={{ color: "#64748b", marginTop: "0.25rem" }}>
          Define a new data sanitisation or destruction policy
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policy Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PolicyForm />
        </CardContent>
      </Card>
    </>
  );
}
