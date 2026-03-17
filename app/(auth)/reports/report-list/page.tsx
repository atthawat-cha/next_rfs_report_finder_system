'use client'
import { ContentLayout } from '@/components/layouts/content-layout'
import { SearchInput } from '@/components/shared/searchInput'
import React, { useMemo } from 'react'
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import DefaultBreadcrumb from '@/components/shared/breadcrumb'
import ReportTableView from './components/reportMainTable'
import { ReportGetDataType } from '@/lib/types'
import ReportCardView from './components/reportCards'
import toast from 'react-hot-toast'

export default function ReportList() {
  const [reportView, setReportView] = React.useState('table')
  const [reports, setReports] = React.useState<ReportGetDataType[]>([])

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports/report/manage', {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
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
      setReports(data?.data);
      console.log(data)
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  const hanelerSearch = () => {
  }

  const hanelerViewChange = (value: string) => {
    setReportView(value)
  }

  useMemo(() => {
    fetchReports()
  }, [])

  return (
    <ContentLayout title="Report List">
      <div className='w-full item-center my-2'>
        <DefaultBreadcrumb />
      </div>

      <div className='w-full flex item-center justify-between gap-y-5'>
        <SearchInput countRes='10' onSearch={hanelerSearch} />

        <ToggleGroup variant="outline" type="single" defaultValue="table" onValueChange={hanelerViewChange}>
          <ToggleGroupItem value="table" aria-label="Toggle all">
            List
          </ToggleGroupItem>
          <ToggleGroupItem value="card" aria-label="Toggle missed">
            Card
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="container mx-auto py-10 gap-6">
        {reportView === 'table' ? <ReportTableView reports={reports} /> : <ReportCardView reports={reports} />}
      </div>

    </ContentLayout>
  )
}
