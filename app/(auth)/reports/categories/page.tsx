'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import DefaultBreadcrumb from '@/components/shared/breadcrumb'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import React from 'react'
import { CatagoriesDataTable } from './components/catagoriesTable'
import { getCatagoryColumn } from './components/catagoriesColumn'
import { Separator } from '@/components/ui/separator'
import { SkeletonTable } from '@/components/shared/skeletonTable'
import { CategoryFormDialog } from './components/categoryFormDialog'
import { DeleteCategoryDialog } from './components/deleteCategoryDialog'
import type { CategoryRow } from './components/categoryTypes'

export default function ReportCategories() {
  const [categories, setCategories] = React.useState<CategoryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryRow | null>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<CategoryRow | null>(null);

  const fetchCategories = React.useCallback(() => {
    setLoading(true);
    fetch('/api/reports/categories', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success) setCategories(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const columns = React.useMemo(
    () =>
      getCatagoryColumn(
        (row) => {
          setEditingCategory(row);
          setFormOpen(true);
        },
        (row) => setDeletingCategory(row)
      ),
    []
  );

  return (
    <ContentLayout title="Report Categories">
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb />
      </div>

      <Card className="container mx-auto py-10 gap-6 mt-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xl md:text-3xl font-bold">Report Categories</h4>
          <Button
            onClick={() => {
              setEditingCategory(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> New Category
          </Button>
        </div>
        <Separator className="my-5" />
        {loading ? <SkeletonTable /> : <CatagoriesDataTable columns={columns} data={categories} />}
      </Card>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        onSaved={fetchCategories}
      />

      <DeleteCategoryDialog
        category={deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        onDeleted={fetchCategories}
      />
    </ContentLayout>
  )
}
