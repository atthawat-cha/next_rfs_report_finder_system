"use client";
import { ContentLayout } from "@/components/layouts/content-layout";
import { SearchInput } from "@/components/shared/searchInput";
import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import DefaultBreadcrumb from "@/components/shared/breadcrumb";
import ReportTableView from "./reportMainTable";
import { ReportGetDataType } from "@/lib/types";
import ReportCardView from "./reportCards";
import QuickActions from "./quickActions";
import CategoryFolders, { CategoryFacet } from "./categoryFolders";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { SkeletonTable } from "@/components/shared/skeletonTable";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { SearchX, X, List, Grid2x2 } from "lucide-react";

const PAGE_SIZE = 20;

interface DepartmentFacet {
  id: string;
  name: string;
  count: number;
}

export default function ReportListView({ isAdmin }: { isAdmin: boolean }) {
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

  const [categories, setCategories] = React.useState<CategoryFacet[]>([]);
  const [departments, setDepartments] = React.useState<DepartmentFacet[]>([]);
  const [categoryId, setCategoryId] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set());

  const fetchReports = React.useCallback(async (query: string, pageNum: number, category: string, department: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (category) params.set("category", category);
      if (department) params.set("department", department);
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

  const fetchFacets = React.useCallback(async () => {
    try {
      const res = await fetch("/api/reports/browse/facets", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.success) return;
      setCategories(data.data?.categories ?? []);
      setDepartments(data.data?.departments ?? []);
    } catch (error) {
      console.error("Error fetching browse facets:", error);
    }
  }, []);

  const fetchFavoriteIds = React.useCallback(async () => {
    try {
      const res = await fetch("/api/reports/favorites", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.success) return;
      const ids = (data.data as ReportGetDataType[]).map((r) => r.id).filter((id): id is string => Boolean(id));
      setFavoriteIds(new Set(ids));
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  }, []);

  React.useEffect(() => {
    fetchReports(q, page, categoryId, departmentId);
  }, [q, page, categoryId, departmentId, fetchReports]);

  React.useEffect(() => {
    fetchFacets();
    fetchFavoriteIds();
  }, [fetchFacets, fetchFavoriteIds]);

  const handleToggleFavorite = React.useCallback((reportId: string, next: boolean) => {
    setFavoriteIds((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(reportId);
      else copy.delete(reportId);
      return copy;
    });
  }, []);

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

  const handleSelectCategory = (id: string) => {
    setPage(1);
    setCategoryId(id);
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <ContentLayout title={t("pageTitle")}>
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb items={[
          { label: tc("breadcrumbDashboard"), href: "/dashboard" },
          { label: t("pageTitle") },
        ]} />
      </div>

      <div className="container mx-auto py-10 gap-6">
        {isAdmin && <QuickActions />}

        <CategoryFolders
          categories={categories}
          selectedId={categoryId}
          onSelect={handleSelectCategory}
          isAdmin={isAdmin}
        />

        <div className="w-full flex flex-wrap items-center justify-between gap-3 mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput countRes={total.toString()} defaultValue={q} onSearch={hanelerSearch} />
            <Select value={departmentId || "__all__"} onValueChange={(v) => { setPage(1); setDepartmentId(v === "__all__" ? "" : v); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("filters.allDepartments")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("filters.allDepartments")}</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name} ({d.count})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 item-center">
            <ToggleGroup
              variant="outline"
              type="single"
              defaultValue="table"
              onValueChange={hanelerViewChange}
              className="rounded-full border p-1 gap-1"
            >
              {/* Icon-only, matching the reference layout's compact view-toggle
                  cluster - aria-label carries the accessible name now that
                  there's no visible text ("List"/"Card" labels were the
                  previous shape of this same toggle). */}
              <ToggleGroupItem
                value="table"
                aria-label={t("viewList")}
                className="h-8 w-8 rounded-full p-0 border-0 data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="card"
                aria-label={t("viewCard")}
                className="h-8 w-8 rounded-full p-0 border-0 data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                <Grid2x2 className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {selectedCategory && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-accent px-3 py-1 text-xs font-medium">
            {t("filters.filteringBy", { name: selectedCategory.name })}
            <button
              type="button"
              onClick={() => handleSelectCategory("")}
              className="rounded-full p-0.5 hover:bg-background"
              aria-label={t("filters.clear")}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="w-full mt-5">
          {loading ? (
            <SkeletonTable />
          ) : reports.length === 0 ? (
            <Empty className="border border-dashed rounded-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>{t("emptyState.title")}</EmptyTitle>
                <EmptyDescription>{t("emptyState.description")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : reportView === "table" ? (
            <ReportTableView reports={reports} />
          ) : (
            <ReportCardView reports={reports} favoriteIds={favoriteIds} onToggleFavorite={handleToggleFavorite} />
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
