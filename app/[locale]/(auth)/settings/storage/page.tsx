'use client';

import * as React from 'react';
import { ContentLayout } from '@/components/layouts/content-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Admin-only storage settings (Phase 5e) - fills in the page
 * lib/menu-list.ts already linked to ("File Storage Settings") but that
 * never existed. UPLOAD_BASE_PATH and the three per-file_kind max sizes,
 * both consumed through lib/storage-path.ts so upload/download/preview
 * agree on where files actually live. No client-side role gate - matches
 * this repo's established pattern of relying on the API's 403.
 */
export default function StorageSettingsPage() {
  const t = useTranslations('settings.storage');
  const tc = useTranslations('common');
  const [uploadBasePath, setUploadBasePath] = React.useState('');
  const [maxBlankForm, setMaxBlankForm] = React.useState('');
  const [maxSampleFilledForm, setMaxSampleFilledForm] = React.useState('');
  const [maxSampleData, setMaxSampleData] = React.useState('');
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
          setUploadBasePath(json.data.upload_base_path);
          setMaxBlankForm(String(Math.round(json.data.max_upload_size_blank_form / 1024 / 1024)));
          setMaxSampleFilledForm(String(Math.round(json.data.max_upload_size_sample_filled_form / 1024 / 1024)));
          setMaxSampleData(String(Math.round(json.data.max_upload_size_sample_data / 1024 / 1024)));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const blankMb = Number(maxBlankForm);
    const filledMb = Number(maxSampleFilledForm);
    const dataMb = Number(maxSampleData);
    if (!uploadBasePath.trim()) {
      toast.error(t('errors.missingUploadBasePath'));
      return;
    }
    if (![blankMb, filledMb, dataMb].every((v) => Number.isFinite(v) && v > 0)) {
      toast.error(t('errors.invalidMaxSize'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          upload_base_path: uploadBasePath.trim(),
          max_upload_size_blank_form: Math.round(blankMb * 1024 * 1024),
          max_upload_size_sample_filled_form: Math.round(filledMb * 1024 * 1024),
          max_upload_size_sample_data: Math.round(dataMb * 1024 * 1024),
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
          <CardDescription>
            {t('cardDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="upload-base-path">{t('uploadBasePathLabel')}</Label>
                <Input
                  id="upload-base-path"
                  value={uploadBasePath}
                  onChange={(e) => setUploadBasePath(e.target.value)}
                  className="max-w-md"
                  placeholder="public"
                />
                <p className="text-sm text-muted-foreground">
                  {t.rich('uploadBasePathDescription', { code: (chunks) => <code>{chunks}</code> })}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="max-blank-form">{t('maxBlankFormLabel')}</Label>
                  <Input id="max-blank-form" type="number" min="1" value={maxBlankForm} onChange={(e) => setMaxBlankForm(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-sample-filled">{t('maxSampleFilledFormLabel')}</Label>
                  <Input id="max-sample-filled" type="number" min="1" value={maxSampleFilledForm} onChange={(e) => setMaxSampleFilledForm(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-sample-data">{t('maxSampleDataLabel')}</Label>
                  <Input id="max-sample-data" type="number" min="1" value={maxSampleData} onChange={(e) => setMaxSampleData(e.target.value)} />
                </div>
              </div>

              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tc('save')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
