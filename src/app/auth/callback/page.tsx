import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPostLoginRedirect } from "@/lib/user-redirect";

/**
 * Post-login callback page.
 * Determines where to redirect the user based on their access type:
 * - Staff (Membership) -> /dashboard
 * - Customer (CustomerAccess) -> /portal/dashboard
 * - Both -> /dashboard (with portal access)
 * - None -> /no-access
 */
export default async function AuthCallback() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const redirectPath = await getPostLoginRedirect(session.user.id);
  redirect(redirectPath);
}
