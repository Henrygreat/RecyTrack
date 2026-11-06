import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { requireMember } from "@/lib/access";
import { AppShell } from "@/components/layout";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, membership } = await requireMember();

  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  if (!user) {
    redirect("/login");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <AppShell
      organizationName={membership.organization.name}
      userName={user.name}
      userEmail={user.email}
      userRole={membership.role}
      onSignOut={handleSignOut}
    >
      {children}
    </AppShell>
  );
}
