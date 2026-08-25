'use client';

import { useCallback, useEffect, useState } from 'react';
import { ContentLayout } from '@/components/layouts/content-layout';
import DefaultBreadcrumb from '@/components/shared/breadcrumb';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SkeletonTable } from '@/components/shared/skeletonTable';
import { useLocale, useTranslations } from 'next-intl';
import { toIntlLocale } from '@/lib/utils';

interface ActivityLogUser {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
}

interface ActivityLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  description: string | null;
  ip_address: string | null;
  created_at: string;
  users: ActivityLogUser | null;
}

const ENTITY_OPTIONS = ['report', 'user', 'department', 'role', 'auth'];
const PAGE_SIZE = 20;

export default function UsersActivityLog() {
  const t = useTranslations('userManagement.activity');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [users, setUsers] = useState<ActivityLogUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string>('all');
  const [entity, setEntity] = useState<string>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    fetch('/api/users/user', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.success) setUsers(data.data);
      })
      .catch((err) => console.error('Error fetching users:', err));
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (userId !== 'all') params.set('user_id', userId);
      if (entity !== 'all') params.set('entity', entity);
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to).toISOString());

      const res = await fetch(`/api/activity-logs?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      if (data?.success) {
        setLogs(data.data);
        setTotalPages(data.meta?.totalPages ?? 1);
        setTotal(data.meta?.total ?? 0);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, userId, entity, from, to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = () => setPage(1);

  return (
    <ContentLayout title={t('pageTitle')}>
      <div className="w-full item-center my-2">
        <DefaultBreadcrumb items={[
          { label: tc('breadcrumbDashboard'), href: '/dashboard' },
          { label: t('breadcrumbUsersManagement'), href: '/user-management/user-list' },
          { label: t('pageTitle') },
        ]} />
      </div>

      <Card className="container mx-auto py-10 gap-6 mt-5">
        <div className="flex items-center justify-between px-6">
          <h4 className="text-xl md:text-3xl font-bold">{t('cardTitle')}</h4>
          <span className="text-sm text-muted-foreground">{t('totalCount', { count: total.toLocaleString() })}</span>
        </div>
        <Separator className="my-5" />

        <div className="grid grid-cols-2 gap-4 px-6 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>{t('userLabel')}</Label>
            <Select
              value={userId}
              onValueChange={(v) => {
                setUserId(v);
                handleFilterChange();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('allOption')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allOption')}</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('entityLabel')}</Label>
            <Select
              value={entity}
              onValueChange={(v) => {
                setEntity(v);
                handleFilterChange();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('allOption')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allOption')}</SelectItem>
                {ENTITY_OPTIONS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('fromDateLabel')}</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                handleFilterChange();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('toDateLabel')}</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                handleFilterChange();
              }}
            />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-md border mx-6">
          {loading ? (
            <div className="p-4">
              <SkeletonTable />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.time')}</TableHead>
                  <TableHead>{t('columns.user')}</TableHead>
                  <TableHead>{t('columns.action')}</TableHead>
                  <TableHead>{t('columns.entity')}</TableHead>
                  <TableHead>{t('columns.description')}</TableHead>
                  <TableHead>{t('columns.ip')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length ? (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs tabular-nums">
                        {new Date(log.created_at).toLocaleString(toIntlLocale(locale))}
                      </TableCell>
                      <TableCell>{log.users?.username ?? '-'}</TableCell>
                      <TableCell className="capitalize">{log.action}</TableCell>
                      <TableCell className="capitalize">{log.entity}</TableCell>
                      <TableCell className="max-w-[320px] truncate">{log.description ?? '-'}</TableCell>
                      <TableCell className="text-xs">{log.ip_address ?? '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {t('noData')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between px-6">
          <span className="text-sm text-muted-foreground">
            {t('pageInfo', { page, totalPages })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t('previous')}
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              {t('next')}
            </Button>
          </div>
        </div>
      </Card>
    </ContentLayout>
  );
}
