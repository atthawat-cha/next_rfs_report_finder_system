
'use client'
import { ContentLayout } from "@/components/layouts/content-layout";
import { useTranslations } from "next-intl";
export default function RoleManagementPage() {
    const t = useTranslations("roleManagement.manage");
    return (
        <ContentLayout title={t("pageTitle")}>
            <h1>{t("pageTitle")}</h1>
        </ContentLayout>
    );
}