'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import DefaultBreadcrumb from '@/components/shared/breadcrumb'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import React from 'react'
import { Separator } from '@/components/ui/separator'
import TagsTable from './components/tagsTable'
import { getTagColumn } from './components/tagsColumn'
import { SkeletonTable } from '@/components/shared/skeletonTable'
import { TagFormDialog } from './components/tagFormDialog'
import { DeleteTagDialog } from './components/deleteTagDialog'
import type { TagRow } from './components/tagTypes'

export default function ReportTags() {
  const [tags, setTags] = React.useState<TagRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<TagRow | null>(null);
  const [deletingTag, setDeletingTag] = React.useState<TagRow | null>(null);

  const fetchTags = React.useCallback(() => {
    setLoading(true);
    fetch('/api/reports/tags', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success) setTags(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const columns = React.useMemo(
    () =>
      getTagColumn(
        (row) => {
          setEditingTag(row);
          setFormOpen(true);
        },
        (row) => setDeletingTag(row)
      ),
    []
  );

  return (
    <ContentLayout title="Report Tags">
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb />
      </div>

      <Card className="container mx-auto py-10 gap-6 mt-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xl md:text-3xl font-bold">Report Tags</h4>
          <Button
            onClick={() => {
              setEditingTag(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> New Tag
          </Button>
        </div>
        <Separator className="my-5" />
        {loading ? <SkeletonTable /> : <TagsTable columns={columns} data={tags} />}
      </Card>

      <TagFormDialog open={formOpen} onOpenChange={setFormOpen} tag={editingTag} onSaved={fetchTags} />

      <DeleteTagDialog
        tag={deletingTag}
        onOpenChange={(open) => !open && setDeletingTag(null)}
        onDeleted={fetchTags}
      />
    </ContentLayout>
  )
}
