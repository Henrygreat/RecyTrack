import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPostLoginRedirect } from "@/lib/user-redirect";

/**
 * Home page - redirects users to appropriate dashboard based on access type.
 * - Authenticated staff -> /dashboard
 * - Authenticated customers -> /portal/dashboard
 * - Not authenticated -> /login
 */
export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const redirectPath = await getPostLoginRedirect(session.user.id);
  redirect(redirectPath);
}
