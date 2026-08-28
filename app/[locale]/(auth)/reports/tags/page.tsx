'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import DefaultBreadcrumb from '@/components/shared/breadcrumb'
import { Button } from '@/components/ui/button'
import { Plus, SearchX } from 'lucide-react'
import React from 'react'
import TagsTable from './components/tagsTable'
import { getTagColumn } from './components/tagsColumn'
import { SkeletonTable } from '@/components/shared/skeletonTable'
import { TagFormDialog } from './components/tagFormDialog'
import { DeleteTagDialog } from './components/deleteTagDialog'
import type { TagRow } from './components/tagTypes'
import { useTranslations } from 'next-intl'
import { SearchInput } from '@/components/shared/searchInput'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty'

const PAGE_SIZE = 20;

export default function ReportTags() {
  const t = useTranslations('reports.tags')
  const tList = useTranslations('reports.list')
  const tc = useTranslations('common')
  const [tags, setTags] = React.useState<TagRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<TagRow | null>(null);
  const [deletingTag, setDeletingTag] = React.useState<TagRow | null>(null);

  const fetchTags = React.useCallback((query: string, pageNum: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(pageNum));
    params.set("pageSize", String(PAGE_SIZE));
    fetch(`/api/reports/tags?${params.toString()}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.success) return;
        setTags(json.data);
        setTotal(json.meta?.total ?? 0);
        setTotalPages(json.meta?.totalPages ?? 1);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchTags(search, page);
  }, [search, page, fetchTags]);

  const hanelerSearch = (value: string) => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 300);
  };

  const columns = React.useMemo(
    () =>
      getTagColumn(
        (row) => {
          setEditingTag(row);
          setFormOpen(true);
        },
        (row) => setDeletingTag(row),
        tc
      ),
    [tc]
  );

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
          <h2 className="text-sm font-bold">{t("pageTitle")}</h2>

          <div className="flex flex-nowrap items-center gap-2 ml-auto shrink-0">
            <SearchInput countRes={total.toString()} onSearch={hanelerSearch} />
            <Button
              onClick={() => {
                setEditingTag(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" /> {t("newTag")}
            </Button>
          </div>
        </div>

        <div className="w-full mt-5">
          {loading ? (
            <SkeletonTable />
          ) : tags.length === 0 ? (
            <Empty className="border border-dashed rounded-xl">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>{t("emptyState.title")}</EmptyTitle>
                <EmptyDescription>{t("emptyState.description")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <TagsTable columns={columns} data={tags} />
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {tList("pageInfo", { page, totalPages })}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                {tList("previous")}
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                {tList("next")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <TagFormDialog open={formOpen} onOpenChange={setFormOpen} tag={editingTag} onSaved={() => fetchTags(search, page)} />

      <DeleteTagDialog
        tag={deletingTag}
        onOpenChange={(open) => !open && setDeletingTag(null)}
        onDeleted={() => {
          if (tags.length === 1 && page > 1) setPage(page - 1);
          else fetchTags(search, page);
        }}
      />
    </ContentLayout>
  )
}
