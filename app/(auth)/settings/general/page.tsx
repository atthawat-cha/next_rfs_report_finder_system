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
      toast.error('กรุณาระบุขนาดพื้นที่จัดเก็บเป็นตัวเลขมากกว่า 0');
      return;
    }
    const pageSize = Number(defaultPageSize);
    if (!Number.isFinite(pageSize) || pageSize < 1 || pageSize > 200) {
      toast.error('ขนาดหน้าเริ่มต้นต้องเป็นตัวเลข 1-200');
      return;
    }
    const shareExpiryDays = Number(defaultShareExpiryDays);
    if (!Number.isFinite(shareExpiryDays) || shareExpiryDays < 0) {
      toast.error('จำนวนวันหมดอายุลิงก์แชร์ต้องเป็นตัวเลข 0 หรือมากกว่า');
      return;
    }
    if (adminEmail && !/^\S+@\S+\.\S+$/.test(adminEmail)) {
      toast.error('อีเมลผู้ดูแลระบบไม่ถูกต้อง');
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
          <CardDescription>ขีดจำกัดพื้นที่จัดเก็บ, โหมดปิดปรับปรุงระบบ, และค่าองค์กร</CardDescription>
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

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="org-name">ชื่อองค์กร</Label>
                  <Input id="org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="RFS Report Finder System" />
                  <p className="text-sm text-muted-foreground">แสดงบนหน้าเข้าสู่ระบบ</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">อีเมลผู้ดูแลระบบ</Label>
                  <Input id="admin-email" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" />
                  <p className="text-sm text-muted-foreground">แสดงเป็นช่องทางติดต่อเมื่อเกิดข้อผิดพลาด</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-page-size">ขนาดหน้าเริ่มต้น (รายการ/หน้า)</Label>
                  <Input id="default-page-size" type="number" min="1" max="200" value={defaultPageSize} onChange={(e) => setDefaultPageSize(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-share-expiry">วันหมดอายุลิงก์แชร์เริ่มต้น (0 = ไม่หมดอายุ)</Label>
                  <Input id="default-share-expiry" type="number" min="0" value={defaultShareExpiryDays} onChange={(e) => setDefaultShareExpiryDays(e.target.value)} />
                </div>
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
