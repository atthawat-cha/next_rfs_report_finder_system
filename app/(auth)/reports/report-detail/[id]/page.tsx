import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReportDetailView from "./components/reportDetailView";

const ADMIN_ROLES = ["admin", "super_admin"];

/**
 * Server wrapper only to resolve isAdmin (via the httpOnly auth cookie)
 * before the client view decides whether to render/fetch the admin-only
 * Queries section at all - same pattern as app/(auth)/dashboard/page.tsx.
 */
export default async function ReportDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isAdmin = ADMIN_ROLES.includes(user.roles?.name?.toLowerCase() ?? "");

  return <ReportDetailView reportId={id} isAdmin={isAdmin} />;
}
