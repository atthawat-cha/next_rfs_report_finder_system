import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import ReportListView from "./components/reportListView";

const ADMIN_ROLES = ["admin", "super_admin"];

/**
 * Server wrapper only to resolve isAdmin (via the httpOnly auth cookie)
 * before the client view decides whether to render the create/manage quick
 * actions - same pattern as report-detail/[id]/page.tsx and dashboard/page.tsx.
 */
export default async function ReportListPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const isAdmin = ADMIN_ROLES.includes(user.roles?.name?.toLowerCase() ?? "");

  return <ReportListView isAdmin={isAdmin} />;
}
