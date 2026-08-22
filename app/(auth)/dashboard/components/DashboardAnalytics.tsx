'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendAreaChart } from '@/components/shared/charts/TrendAreaChart';
import { BreakdownBarChart } from '@/components/shared/charts/BreakdownBarChart';

type TrendGranularity = 'day' | 'month';

interface DashboardSummary {
  by_status: { status: string; count: number }[];
  by_category: { category_id: string; category_name: string; count: number }[];
  by_department: { department_id: string; department_name: string; count: number }[];
  totals: {
    reports: number;
    active_users: number;
    downloads: number;
    favorites: number;
    storage_bytes: number;
  };
}

interface TrendPoint {
  date: string;
  count: number;
}

interface TopReport {
  id: string;
  code: string;
  name_th: string;
  name_en: string | null;
  category_name: string | null;
  download_count: number;
  favorite_count: number;
}

interface AuthAlert {
  ip_address: string;
  attempts: number;
  targeted_accounts: number;
  first_attempt_at: string;
  last_attempt_at: string;
}

const STATUS_COLOR_VAR: Record<string, string> = {
  DRAFT: '--chart-1',
  PUBLISHED: '--chart-3',
  ARCHIVED: '--chart-2',
};

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, exp)).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

/** Admin-only analytics view — /api/dashboard/* are routeAcceptted('admin'), see phase3-plan.md 3d. */
export default function DashboardAnalytics() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>('day');
  const [topReports, setTopReports] = useState<TopReport[]>([]);
  const [authAlerts, setAuthAlerts] = useState<AuthAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, topRes, authAlertsRes] = await Promise.all([
        fetch('/api/dashboard/summary', { credentials: 'include' }),
        fetch('/api/dashboard/top-reports?limit=10', { credentials: 'include' }),
        fetch('/api/dashboard/auth-alerts?hours=24', { credentials: 'include' }),
      ]);

      const [summaryJson, topJson, authAlertsJson] = await Promise.all([
        summaryRes.json(),
        topRes.json(),
        authAlertsRes.json(),
      ]);

      if (summaryJson?.success) setSummary(summaryJson.data);
      if (topJson?.success) setTopReports(topJson.data);
      if (authAlertsJson?.success) setAuthAlerts(authAlertsJson.data.alerts);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrends = useCallback(async (granularity: TrendGranularity) => {
    try {
      const res = await fetch(`/api/dashboard/trends?granularity=${granularity}`, { credentials: 'include' });
      const json = await res.json();
      if (json?.success) setTrends(json.data);
    } catch (error) {
      console.error('Error fetching dashboard trends:', error);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchTrends(trendGranularity);
  }, [trendGranularity, fetchTrends]);

  return (
    <div className="space-y-6 mt-5">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รายงานทั้งหมด</CardDescription>
            <CardTitle className="text-3xl">{summary?.totals.reports.toLocaleString() ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ผู้ใช้ที่ใช้งานอยู่</CardDescription>
            <CardTitle className="text-3xl">{summary?.totals.active_users.toLocaleString() ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ดาวน์โหลดทั้งหมด</CardDescription>
            <CardTitle className="text-3xl">{summary?.totals.downloads.toLocaleString() ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>พื้นที่จัดเก็บที่ใช้ไป</CardDescription>
            <CardTitle className="text-3xl">
              {summary ? formatBytes(summary.totals.storage_bytes) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              แนวโน้มการดาวน์โหลด ({trendGranularity === 'day' ? '30 วันล่าสุด' : '12 เดือนล่าสุด'})
            </CardTitle>
            <CardDescription>
              {trendGranularity === 'day' ? 'จำนวนดาวน์โหลดรายวัน' : 'จำนวนดาวน์โหลดรายเดือน'}
            </CardDescription>
          </div>
          <ToggleGroup
            variant="outline"
            type="single"
            value={trendGranularity}
            onValueChange={(value) => value && setTrendGranularity(value as TrendGranularity)}
          >
            <ToggleGroupItem value="day" aria-label="รายวัน">
              รายวัน
            </ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label="รายเดือน">
              รายเดือน
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          <TrendAreaChart data={trends} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>รายงานแยกตามสถานะ</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBarChart
              showLegend
              data={(summary?.by_status ?? []).map((row) => ({
                label: row.status,
                value: row.count,
                colorVar: STATUS_COLOR_VAR[row.status] ?? '--chart-1',
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รายงานแยกตามหมวดหมู่</CardTitle>
          </CardHeader>
          <CardContent>
            <BreakdownBarChart
              data={(summary?.by_category ?? [])
                .slice()
                .sort((a, b) => b.count - a.count)
                .slice(0, 8)
                .map((row) => ({ label: row.category_name, value: row.count }))}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายงานที่ถูกใช้งานมากที่สุด (Top 10)</CardTitle>
          <CardDescription>เรียงตามยอดดาวน์โหลด</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัส</TableHead>
                  <TableHead>ชื่อรายงาน</TableHead>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead className="text-right">ดาวน์โหลด</TableHead>
                  <TableHead className="text-right">รายการโปรด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topReports.length ? (
                  topReports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell>{r.name_th}</TableCell>
                      <TableCell>{r.category_name ?? '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.download_count.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.favorite_count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {loading ? 'กำลังโหลด...' : 'ไม่มีข้อมูล'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ความผิดปกติของการเข้าสู่ระบบ (24 ชม. ล่าสุด)</CardTitle>
          <CardDescription>IP ที่ล็อกอินผิดตั้งแต่ 5 ครั้งขึ้นไป</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">จำนวนครั้งที่ผิด</TableHead>
                  <TableHead className="text-right">บัญชีที่ถูกพยายามเข้า</TableHead>
                  <TableHead>ครั้งล่าสุด</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authAlerts.length ? (
                  authAlerts.map((alert) => (
                    <TableRow key={alert.ip_address}>
                      <TableCell className="font-mono text-xs">{alert.ip_address}</TableCell>
                      <TableCell className="text-right tabular-nums">{alert.attempts.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">{alert.targeted_accounts.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{new Date(alert.last_attempt_at).toLocaleString('th-TH')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {loading ? 'กำลังโหลด...' : 'ไม่พบความผิดปกติ'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
