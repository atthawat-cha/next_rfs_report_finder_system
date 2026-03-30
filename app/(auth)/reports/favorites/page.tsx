'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import React from 'react'
import FavReportCardView from './components/favReportCard'
import { fakeReportList } from "@/fakedata/fakeReportList";
import DefaultBreadcrumb from '@/components/shared/breadcrumb';
import FavReportMainTableView from './components/favReportMainTable';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SearchInput } from '@/components/shared/searchInput';
import { Card } from '@/components/ui/card';

export default function ReportFavorites() {

  const [reportView, setReportView] = React.useState("table");
  const models = fakeReportList;
  console.log(models)


  const hanelerSearch = (search: string) => {
    console.log(search)
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
            <SearchInput countRes={models.length.toString()} onSearch={hanelerSearch} />
          </div>
        </div>


        <div className="w-full mt-5">
          {reportView === "table" ? (
            <FavReportMainTableView reports={models} />
          ) : (
            <FavReportCardView reports={models} />
          )}
        </div>
      </Card>

    </ContentLayout>
  )
}
