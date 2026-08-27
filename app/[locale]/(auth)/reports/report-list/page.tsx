"use client";
import { ContentLayout } from "@/components/layouts/content-layout";
import { SearchInput } from "@/components/shared/searchInput";
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import DefaultBreadcrumb from "@/components/shared/breadcrumb";
import ReportTableView from "./components/reportMainTable";
import { ReportGetDataType } from "@/lib/types";
import ReportCardView from "./components/reportCards";
import { Button } from "@/components/ui/button";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { SkeletonTable } from "@/components/shared/skeletonTable";
import { useTranslations } from "next-intl";

const PAGE_SIZE = 20;

export default function ReportList() {
  const t = useTranslations("reports.list");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const [reportView, setReportView] = React.useState("table");
  const [reports, setReports] = React.useState<ReportGetDataType[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchReports = React.useCallback(async (query: string, pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      params.set("page", String(pageNum));
      params.set("pageSize", String(PAGE_SIZE));

      const res = await fetch(`/api/reports/browse?${params.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        console.error(await res.text());
        return;
      }

      const data = await res.json();
      if (!data?.success) {
        return;
      }
      setReports(data?.data ?? []);
      setTotal(data?.meta?.total ?? 0);
      setTotalPages(data?.meta?.totalPages ?? 1);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReports(q, page);
  }, [q, page, fetchReports]);

  const hanelerSearch = (value: string) => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("q", value);
      else params.delete("q");
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
  };

  const hanelerViewChange = (value: string) => {
    setReportView(value);
  };

  return (
    <ContentLayout title={t("pageTitle")}>
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb items={[
          { label: tc("breadcrumbDashboard"), href: "/dashboard" },
          { label: t("pageTitle") },
        ]} />
      </div>

      <div className="container mx-auto py-10 gap-6">
        <div className="w-full flex item-center justify-between mt-5">
          <ToggleGroup
            variant="outline"
            type="single"
            defaultValue="table"
            onValueChange={hanelerViewChange}
          >
            {/* No aria-label needed - the visible text ("List"/"Card") is
                already the correct accessible name. The previous labels
                ("Toggle all"/"Toggle missed") were leftover shadcn demo
                copy that contradicted what these buttons actually do. */}
            <ToggleGroupItem value="table">
              {t("viewList")}
            </ToggleGroupItem>
            <ToggleGroupItem value="card">
              {t("viewCard")}
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="flex gap-2 item-center">
            <SearchInput countRes={total.toString()} defaultValue={q} onSearch={hanelerSearch} />
            <Button asChild >
              <Link href="/reports/report-create">{t("createButton")}</Link>
            </Button>
          </div>
        </div>

        <div className="w-full mt-5">
          {loading ? (
            <SkeletonTable />
          ) : reportView === "table" ? (
            <ReportTableView reports={reports} />
          ) : (
            <ReportCardView reports={reports} />
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("pageInfo", { page, totalPages })}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {t("previous")}
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                {t("next")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ContentLayout>
  );
}
