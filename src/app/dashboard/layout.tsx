import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { requireMember } from "@/lib/access";
import { AppShell } from "@/components/layout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { membership } = await requireMember();

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AppShell
      organizationName={membership.organization.name}
      onSignOut={handleSignOut}
    >
      {children}
    </AppShell>
  );
}
