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

/**
 * Admin-only system settings (Phase 4e). No client-side role gate — matches
 * this repo's existing pattern (e.g. role-management/roles) of relying on
 * the API's routeAcceptted('admin') check as the real boundary.
 */
export default function SystemSettingsPage() {
  const [storageLimitGb, setStorageLimitGb] = React.useState('');
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);
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
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const gb = Number(storageLimitGb);
    if (!Number.isFinite(gb) || gb <= 0) {
      toast.error('กรุณาระบุขนาดพื้นที่จัดเก็บเป็นตัวเลขมากกว่า 0');
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
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.[0]?.message ?? json.error ?? 'บันทึกไม่สำเร็จ');
        return;
      }
      toast.success('บันทึกการตั้งค่าเรียบร้อย');
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) {
    return (
      <ContentLayout title="System Settings">
        <p className="text-muted-foreground">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="System Settings">
      <Card>
        <CardHeader>
          <CardTitle>การตั้งค่าระบบทั่วไป</CardTitle>
          <CardDescription>ขีดจำกัดพื้นที่จัดเก็บและโหมดปิดปรับปรุงระบบ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="storage-limit">ขีดจำกัดพื้นที่จัดเก็บไฟล์รายงาน (GB)</Label>
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
                  เมื่อพื้นที่ใช้ไปถึงขีดจำกัดนี้ ผู้ดูแลระบบจะได้รับการแจ้งเตือน
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between max-w-md">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance-mode">โหมดปิดปรับปรุงระบบ</Label>
                  <p className="text-sm text-muted-foreground">
                    เปิดใช้งานเพื่อแจ้งเตือนผู้ใช้ทุกคนว่าระบบกำลังปิดปรับปรุง (ไม่ได้ปิดกั้นการใช้งานจริง)
                  </p>
                </div>
                <Switch id="maintenance-mode" checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>

              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                บันทึก
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
