'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import React from 'react'
import FavReportCardView from './components/favReportCard'
import DefaultBreadcrumb from '@/components/shared/breadcrumb';
import FavReportMainTableView from './components/favReportMainTable';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SearchInput } from '@/components/shared/searchInput';
import { Card } from '@/components/ui/card';
import { ReportGetDataType } from '@/lib/types';
import toast from 'react-hot-toast';
import { SkeletonTable } from '@/components/shared/skeletonTable';

export default function ReportFavorites() {

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
        toast.error("Failed to remove favorite");
        return;
      }
      setFavorites((prev) => prev.filter((r) => r.id !== reportId));
      toast.success("Removed from favorites");
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast.error("Failed to remove favorite");
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
    <ContentLayout title="Report Favorites">
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb />
      </div>
      <Card className="container mx-auto py-10 gap-6 mt-5">
        <div className="w-full flex item-center justify-between mt-5">
          <ToggleGroup
            variant="outline"
            type="single"
            defaultValue="table"
            onValueChange={hanelerViewChange}
          >
            <ToggleGroupItem value="table" aria-label="Toggle all">
              List
            </ToggleGroupItem>
            <ToggleGroupItem value="card" aria-label="Toggle missed">
              Card
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="flex gap-2 item-center">
            <SearchInput countRes={filteredFavorites.length.toString()} onSearch={hanelerSearch} />
          </div>
        </div>


        <div className="w-full mt-5">
          {loading ? (
            <SkeletonTable />
          ) : reportView === "table" ? (
            <FavReportMainTableView reports={filteredFavorites} onUnfavorite={handleUnfavorite} />
          ) : (
            <FavReportCardView reports={filteredFavorites} />
          )}
        </div>
      </Card>

    </ContentLayout>
  )
}
