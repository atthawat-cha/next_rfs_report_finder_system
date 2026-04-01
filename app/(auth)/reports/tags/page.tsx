'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import DefaultBreadcrumb from '@/components/shared/breadcrumb'
import { DrawerDialogDemo } from '@/components/shared/dialog-drawer'
import { Card } from '@/components/ui/card'
import React, { useState } from 'react'
import TagsCreateForm from './components/tagsCreateForm'
import { Separator } from '@/components/ui/separator'
import TagsTable from './components/tagsTable'
import { tagsColumn } from './components/tagsColumn'

export default function ReportTags() {

  const [openDialog, setOpenDialog] = useState(false)
  return (
    <ContentLayout title="Report Tags">
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb />
      </div>

      <Card className="container mx-auto py-10 gap-6 mt-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xl md:text-3xl font-bold">Report Tags</h4>
          <DrawerDialogDemo isOpen={openDialog} title="New Report Tag" description="Add new report tag" btnText="New Tag">
            <TagsCreateForm />
          </DrawerDialogDemo>
        </div>
        <Separator className="my-5" />
        <TagsTable columns={tagsColumn} data={[]} />
      </Card>
    </ContentLayout>
  )
}
