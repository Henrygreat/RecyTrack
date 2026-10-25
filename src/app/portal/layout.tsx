import { requireCustomerAccess } from "@/lib/portal-access";
import { signOut } from "@/auth";
import { PortalShell } from "./components/portal-shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireCustomerAccess();

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <PortalShell
      customerName={ctx.customerAccess.customer.name}
      customerReference={ctx.customerAccess.customer.reference}
      isAdmin={ctx.isAdmin}
      onSignOut={handleSignOut}
    >
      {children}
    </PortalShell>
  );
}
