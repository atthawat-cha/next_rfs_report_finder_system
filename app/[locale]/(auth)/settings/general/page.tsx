'use client';

import * as React from 'react';
import { ContentLayout } from '@/components/layouts/content-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Admin-only system settings (Phase 4e). No client-side role gate — matches
 * this repo's existing pattern (e.g. role-management/roles) of relying on
 * the API's routeAcceptted('admin') check as the real boundary.
 */
export default function SystemSettingsPage() {
  const t = useTranslations('settings.general');
  const tc = useTranslations('common');
  const [storageLimitGb, setStorageLimitGb] = React.useState('');
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
  const [orgName, setOrgName] = React.useState('');
  const [adminEmail, setAdminEmail] = React.useState('');
  const [defaultPageSize, setDefaultPageSize] = React.useState('');
  const [defaultShareExpiryDays, setDefaultShareExpiryDays] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [forbidden, setForbidden] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/settings/system', { credentials: 'include' })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setForbidden(true);
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success) {
          setStorageLimitGb((json.data.storage_limit_bytes / 1024 / 1024 / 1024).toFixed(2));
          setMaintenanceMode(json.data.maintenance_mode);
          setOrgName(json.data.org_name);
          setAdminEmail(json.data.admin_email);
          setDefaultPageSize(String(json.data.default_page_size));
          setDefaultShareExpiryDays(String(json.data.default_share_expiry_days));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const gb = Number(storageLimitGb);
    if (!Number.isFinite(gb) || gb <= 0) {
      toast.error(t('errors.invalidStorageLimit'));
      return;
    }
    const pageSize = Number(defaultPageSize);
    if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 200) {
      toast.error(t('errors.invalidPageSize'));
      return;
    }
    const shareExpiryDays = Number(defaultShareExpiryDays);
    if (!Number.isFinite(shareExpiryDays) || shareExpiryDays < 0) {
      toast.error(t('errors.invalidShareExpiry'));
      return;
    }
    if (adminEmail && !/^\S+@\S+\.\S+$/.test(adminEmail)) {
      toast.error(t('errors.invalidAdminEmail'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          storage_limit_bytes: Math.round(gb * 1024 * 1024 * 1024),
          maintenance_mode: maintenanceMode,
          org_name: orgName,
          admin_email: adminEmail,
          default_page_size: pageSize,
          default_share_expiry_days: shareExpiryDays,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.[0]?.message ?? json.error ?? t('errors.saveFailed'));
        return;
      }
      toast.success(t('saveSuccess'));
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) {
    return (
      <ContentLayout title={t('pageTitle')}>
        <p className="text-muted-foreground">{t('forbidden')}</p>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title={t('pageTitle')}>
      <Card>
        <CardHeader>
          <CardTitle>{t('cardTitle')}</CardTitle>
          <CardDescription>{t('cardDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="storage-limit">{t('storageLimitLabel')}</Label>
                <Input
                  id="storage-limit"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={storageLimitGb}
                  onChange={(e) => setStorageLimitGb(e.target.value)}
                  className="max-w-xs"
                />
                <p className="text-sm text-muted-foreground">
                  {t('storageLimitDescription')}
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between max-w-md">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance-mode">{t('maintenanceModeLabel')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('maintenanceModeDescription')}
                  </p>
                </div>
                <Switch id="maintenance-mode" checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="org-name">{t('orgNameLabel')}</Label>
                  <Input id="org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="RFS Report Finder System" />
                  <p className="text-sm text-muted-foreground">{t('orgNameDescription')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">{t('adminEmailLabel')}</Label>
                  <Input id="admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" />
                  <p className="text-sm text-muted-foreground">{t('adminEmailDescription')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-page-size">{t('defaultPageSizeLabel')}</Label>
                  <Input id="default-page-size" type="number" min="1" max="200" value={defaultPageSize} onChange={(e) => setDefaultPageSize(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-share-expiry">{t('defaultShareExpiryLabel')}</Label>
                  <Input id="default-share-expiry" type="number" min="0" value={defaultShareExpiryDays} onChange={(e) => setDefaultShareExpiryDays(e.target.value)} />
                </div>
              </div>

              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tc('save')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
