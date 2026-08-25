'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TrendAreaChart } from '@/components/shared/charts/TrendAreaChart';
import { BreakdownBarChart } from '@/components/shared/charts/BreakdownBarChart';
import { toIntlLocale } from '@/lib/utils';

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
  const t = useTranslations('dashboard.analytics');
  const locale = useLocale();
  const numberLocale = toIntlLocale(locale);
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
            <CardDescription>{t('totalReports')}</CardDescription>
            <CardTitle className="text-3xl">{summary?.totals.reports.toLocaleString(numberLocale) ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('activeUsers')}</CardDescription>
            <CardTitle className="text-3xl">{summary?.totals.active_users.toLocaleString(numberLocale) ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('totalDownloads')}</CardDescription>
            <CardTitle className="text-3xl">{summary?.totals.downloads.toLocaleString(numberLocale) ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('storageUsed')}</CardDescription>
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
              {t('downloadTrendTitle', { period: trendGranularity === 'day' ? t('last30Days') : t('last12Months') })}
            </CardTitle>
            <CardDescription>
              {trendGranularity === 'day' ? t('dailyDownloads') : t('monthlyDownloads')}
            </CardDescription>
          </div>
          <ToggleGroup
            variant="outline"
            type="single"
            value={trendGranularity}
            onValueChange={(value) => value && setTrendGranularity(value as TrendGranularity)}
          >
            <ToggleGroupItem value="day" aria-label={t('daily')}>
              {t('daily')}
            </ToggleGroupItem>
            <ToggleGroupItem value="month" aria-label={t('monthly')}>
              {t('monthly')}
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
            <CardTitle>{t('byStatusTitle')}</CardTitle>
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
            <CardTitle>{t('byCategoryTitle')}</CardTitle>
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
          <CardTitle>{t('topReportsTitle')}</CardTitle>
          <CardDescription>{t('topReportsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columnCode')}</TableHead>
                  <TableHead>{t('columnReportName')}</TableHead>
                  <TableHead>{t('columnCategory')}</TableHead>
                  <TableHead className="text-right">{t('columnDownloads')}</TableHead>
                  <TableHead className="text-right">{t('columnFavorites')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topReports.length ? (
                  topReports.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell>{r.name_th}</TableCell>
                      <TableCell>{r.category_name ?? '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.download_count.toLocaleString(numberLocale)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.favorite_count.toLocaleString(numberLocale)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {loading ? t('loading') : t('noTopReports')}
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
          <CardTitle>{t('authAlertsTitle')}</CardTitle>
          <CardDescription>{t('authAlertsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columnIpAddress')}</TableHead>
                  <TableHead className="text-right">{t('columnFailedAttempts')}</TableHead>
                  <TableHead className="text-right">{t('columnTargetedAccounts')}</TableHead>
                  <TableHead>{t('columnLastAttempt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authAlerts.length ? (
                  authAlerts.map((alert) => (
                    <TableRow key={alert.ip_address}>
                      <TableCell className="font-mono text-xs">{alert.ip_address}</TableCell>
                      <TableCell className="text-right tabular-nums">{alert.attempts.toLocaleString(numberLocale)}</TableCell>
                      <TableCell className="text-right tabular-nums">{alert.targeted_accounts.toLocaleString(numberLocale)}</TableCell>
                      <TableCell className="text-xs">{new Date(alert.last_attempt_at).toLocaleString(numberLocale)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {loading ? t('loading') : t('noAnomalies')}
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
