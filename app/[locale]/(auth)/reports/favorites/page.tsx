'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import React from 'react'
import FavReportCardView from './components/favReportCard'
import DefaultBreadcrumb from '@/components/shared/breadcrumb';
import FavReportMainTableView from './components/favReportMainTable';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SearchInput } from '@/components/shared/searchInput';
import { ReportGetDataType } from '@/lib/types';
import toast from 'react-hot-toast';
import { SkeletonTable } from '@/components/shared/skeletonTable';
import { useTranslations } from 'next-intl';
import { List, Grid2x2, CheckSquare, Info, HeartCrack } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

export default function ReportFavorites() {
  const t = useTranslations('reports.favorites');
  const tList = useTranslations('reports.list');
  const tc = useTranslations('common');

  const [reportView, setReportView] = React.useState("table");
  const [favorites, setFavorites] = React.useState<ReportGetDataType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  const fetchFavorites = React.useCallback(async () => {
    try {
      const res = await fetch("/api/reports/favorites", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        console.error(await res.text());
        return;
      }
      const data = await res.json();
      if (!data?.success) return;
      setFavorites(data?.data ?? []);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleUnfavorite = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/favorites/${reportId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error(t("removeFailed"));
        return;
      }
      setFavorites((prev) => prev.filter((r) => r.id !== reportId));
      toast.success(t("removeSuccess"));
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error(t("removeFailed"));
    }
  };

  const filteredFavorites = search
    ? favorites.filter((r) =>
        `${r.name_th} ${r.name_en ?? ""} ${r.code}`.toLowerCase().includes(search.toLowerCase())
      )
    : favorites;

  const hanelerSearch = (value: string) => {
    setSearch(value)
  }

  const hanelerViewChange = (view: string) => {
    setReportView(view)
  }
  return (
    <ContentLayout title={t("pageTitle")}>
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb items={[
          { label: tc("breadcrumbDashboard"), href: "/dashboard" },
          { label: t("pageTitle") },
        ]} />
      </div>
      <div className="container mx-auto py-10 gap-6">
        <div className="w-full flex flex-wrap items-center gap-3 mt-5">
          <h2 className="text-sm font-bold">{t("sectionTitle")}</h2>

          <div className="flex flex-nowrap items-center gap-2 ml-auto shrink-0">
            <SearchInput countRes={filteredFavorites.length.toString()} onSearch={hanelerSearch} />

            <ToggleGroup
              variant="outline"
              type="single"
              defaultValue="table"
              onValueChange={hanelerViewChange}
              className="rounded-full border p-1 gap-1"
            >
              <ToggleGroupItem
                value="table"
                aria-label={tList("viewList")}
                className="h-8 w-8 rounded-full p-0 border-0 data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="card"
                aria-label={tList("viewCard")}
                className="h-8 w-8 rounded-full p-0 border-0 data-[state=on]:bg-foreground data-[state=on]:text-background"
              >
                <Grid2x2 className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Same "coming soon" pair as reports/report-list - bulk-select
                and a details panel don't exist anywhere in this app yet. */}
            <TooltipProvider disableHoverableContent>
              <div className="flex items-center gap-1 rounded-full border p-1">
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span
                      role="button"
                      aria-disabled="true"
                      className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full text-muted-foreground/50"
                    >
                      <CheckSquare className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{tList("toolbar.selectMultipleComingSoon")}</TooltipContent>
                </Tooltip>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span
                      role="button"
                      aria-disabled="true"
                      className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-full text-muted-foreground/50"
                    >
                      <Info className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{tList("toolbar.detailsPanelComingSoon")}</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>

        <div className="w-full mt-5">
          {loading ? (
            <SkeletonTable />
          ) : filteredFavorites.length === 0 ? (
            <Empty className="border border-dashed rounded-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HeartCrack />
                </EmptyMedia>
                <EmptyTitle>{t("emptyState.title")}</EmptyTitle>
                <EmptyDescription>{t("emptyState.description")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : reportView === "table" ? (
            <FavReportMainTableView reports={filteredFavorites} onUnfavorite={handleUnfavorite} />
          ) : (
            <FavReportCardView reports={filteredFavorites} onUnfavorite={handleUnfavorite} />
          )}
        </div>
      </div>

    </ContentLayout>
  )
}
