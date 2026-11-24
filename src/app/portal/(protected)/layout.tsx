import { requireCustomerAccess } from "@/lib/portal-access";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PortalShell } from "./components/portal-shell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireCustomerAccess();
  const session = await auth();

  // Get user details
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      })
    : null;

  // Get unread notification count (placeholder - implement when notifications table exists)
  const notificationCount = 0;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <PortalShell
      customerName={ctx.customerAccess.customer.name}
      customerReference={ctx.customerAccess.customer.reference}
      isAdmin={ctx.isAdmin}
      userName={user?.name || undefined}
      userEmail={user?.email || undefined}
      onSignOut={handleSignOut}
      notificationCount={notificationCount}
    >
      {children}
    </PortalShell>
  );
}
