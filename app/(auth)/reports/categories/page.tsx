'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import DefaultBreadcrumb from '@/components/shared/breadcrumb'
import { Card } from '@/components/ui/card'
import React from 'react'
import { CatagoriesDataTable } from './components/catagoriesTable'
import { catagory_column } from './components/catagoriesColumn'
import { DrawerDialogDemo } from '@/components/shared/dialog-drawer'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'
import CatagoriesCreateForm from './components/catagoriesCreateForm'

export default function ReportCategories() {

  const [openDialog, setOpenDialog] = useState(false)
  return (
    <ContentLayout title="Report Categories">
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb />
      </div>

      <Card className="container mx-auto py-10 gap-6 mt-5">
        <div className="flex items-center justify-between">
          <h4 className="text-xl md:text-3xl font-bold">Report Categories</h4>
          <DrawerDialogDemo isOpen={openDialog} title="New Report Category" description="Add new report category" btnText="New Category">
            <CatagoriesCreateForm />
          </DrawerDialogDemo>
        </div>
        <Separator className="my-5" />
        <CatagoriesDataTable columns={catagory_column} data={[]} />
      </Card>
    </ContentLayout>
  )
}
