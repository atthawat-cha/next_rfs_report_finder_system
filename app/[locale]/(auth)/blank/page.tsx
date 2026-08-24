import { ContentLayout } from "@/components/layouts/content-layout";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function BlankPage() {
  const t = await getTranslations("common");
  return (
    <ContentLayout title={t("blankPage.title")}>
      <Breadcrumb>
            <BreadcrumbList>
            <BreadcrumbItem>
                <BreadcrumbLink asChild>
                <Link href="/">{t("breadcrumbHome")}</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
                <BreadcrumbLink asChild>
                <Link href="/dashboard">{t("breadcrumbDashboard")}</Link>
                </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
                <BreadcrumbPage>{t("blankPage.title")}</BreadcrumbPage>
            </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">{t("blankPage.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("blankPage.description")}
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 border rounded-lg">
            <h2 className="text-xl font-semibold">{t("blankPage.developmentArea")}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("blankPage.developmentAreaDescription")}
            </p>
          </div>
        </div>
      </div>
    </ContentLayout>
  );
}
