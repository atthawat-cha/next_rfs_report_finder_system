"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { ContentLayout } from "@/components/layouts/content-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SqlBlock } from "@/components/shared/sqlBlock";
import { ReportFilePreview, isPdfFile, type ReportFilePreviewFile } from "@/components/shared/reportFilePreview";
import { ReportPermissionsDrawer } from "@/components/shared/reportPermissionsDrawer";
import { formatDateTime } from "@/lib/utils";
import { Loader2, Download, Printer, Eye, FileText, ShieldCheck } from "lucide-react";

interface ReportDetailAcl {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_favorite: boolean;
  can_export: boolean;
  can_print: boolean;
}

interface ReportDetailData {
  id: string;
  code: string;
  name_th: string;
  name_en: string | null;
  description: string | null;
  version: string;
  status: string;
  access_level: string;
  view_count: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  categories: { id: string; name: string } | null;
  departments: { id: string; name: string } | null;
  files: (ReportFilePreviewFile & { file_size: number })[];
  acl: ReportDetailAcl;
}

interface ReportQuery {
  id: string;
  name: string;
  sql_text: string;
  is_main: boolean;
  version: string;
}

const FILE_KIND_ORDER = ["BLANK_FORM", "SAMPLE_FILLED_FORM", "SAMPLE_DATA", "REFERENCE_DOC"] as const;
const FILE_KIND_LABELS: Record<string, string> = {
  BLANK_FORM: "Pre-form (แบบฟอร์มเปล่า)",
  SAMPLE_FILLED_FORM: "Preview (ตัวอย่างที่กรอกแล้ว)",
  SAMPLE_DATA: "Sample Data (ไฟล์ข้อมูลตัวอย่าง)",
  REFERENCE_DOC: "เอกสารอ้างอิงเพิ่มเติม",
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "แบบร่าง",
  PUBLISHED: "เผยแพร่แล้ว",
  ARCHIVED: "เก็บถาวร",
};
const ACCESS_LABEL: Record<string, string> = {
  PUBLIC: "สาธารณะ",
  RESTRICTED: "จำกัดสิทธิ์",
  PRIVATE: "ส่วนตัว",
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function ReportDetailView({ reportId, isAdmin }: { reportId: string; isAdmin: boolean }) {
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [report, setReport] = React.useState<ReportDetailData | null>(null);
  const [queries, setQueries] = React.useState<ReportQuery[] | null>(null);
  const [previewFileId, setPreviewFileId] = React.useState<string | null>(null);
  const [pendingPrint, setPendingPrint] = React.useState(false);
  const [permissionsOpen, setPermissionsOpen] = React.useState(false);
  const [adminEmail, setAdminEmail] = React.useState('');

  // ADMIN_EMAIL (Phase 5e) - shown as a contact on the not-found state below.
  React.useEffect(() => {
    fetch('/api/settings/public', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json.data.admin_email) setAdminEmail(json.data.admin_email);
      })
      .catch(() => {});
  }, []);

  // GET /api/reports/[id] increments view_count server-side on every call.
  // React StrictMode double-invokes effects in dev, so this guard is what
  // keeps one page visit from counting as two views.
  const fetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch(`/api/reports/${reportId}`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (!json) return;
        if (json?.success) {
          const data = json.data as ReportDetailData;
          setReport(data);
          const firstPdf = data.files.find((f) => isPdfFile(f));
          setPreviewFileId(firstPdf?.id ?? null);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [reportId]);

  React.useEffect(() => {
    if (!isAdmin) return;
    fetch(`/api/reports/${reportId}/queries`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success) setQueries(json.data);
      });
  }, [reportId, isAdmin]);

  React.useEffect(() => {
    if (!pendingPrint || !previewFileId) return;
    // Give the newly-selected file's <embed>/table a moment to load before printing.
    const timer = setTimeout(() => {
      window.print();
      setPendingPrint(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [pendingPrint, previewFileId]);

  function handlePrint(fileId: string) {
    if (previewFileId === fileId) {
      window.print();
    } else {
      setPreviewFileId(fileId);
      setPendingPrint(true);
    }
  }

  if (loading) {
    return (
      <ContentLayout title="รายละเอียดรายงาน">
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> กำลังโหลด...
        </div>
      </ContentLayout>
    );
  }

  if (notFound || !report) {
    return (
      <ContentLayout title="รายละเอียดรายงาน">
        <div className="py-24 text-center text-muted-foreground space-y-1">
          <p>ไม่พบรายงาน</p>
          {adminEmail && <p className="text-sm">หากคิดว่านี่คือข้อผิดพลาด กรุณาติดต่อ {adminEmail}</p>}
        </div>
      </ContentLayout>
    );
  }

  const previewFile = report.files.find((f) => f.id === previewFileId) ?? null;
  const groupedFiles = FILE_KIND_ORDER.map((kind) => ({
    kind,
    files: report.files.filter((f) => f.file_kind === kind),
  })).filter((g) => g.files.length > 0);

  return (
    <ContentLayout title="รายละเอียดรายงาน">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">แดชบอร์ด</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/reports/report-list">รายงาน</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{report.code}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-5 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-2xl">{report.name_th}</CardTitle>
                {report.name_en && <CardDescription>{report.name_en}</CardDescription>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{report.code}</Badge>
                <Badge>{STATUS_LABEL[report.status] ?? report.status}</Badge>
                <Badge variant="secondary">{ACCESS_LABEL[report.access_level] ?? report.access_level}</Badge>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => setPermissionsOpen(true)}>
                    <ShieldCheck className="h-4 w-4 mr-1" /> จัดการสิทธิ์
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.description && <p className="text-sm text-muted-foreground">{report.description}</p>}
            <Separator />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">หมวดหมู่</p>
                <p>{report.categories?.name ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">แผนก</p>
                <p>{report.departments?.name ?? "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">เวอร์ชัน</p>
                <p>{report.version}</p>
              </div>
              <div>
                <p className="text-muted-foreground">เข้าชม / ดาวน์โหลด</p>
                <p>{report.view_count} / {report.download_count}</p>
              </div>
              <div>
                <p className="text-muted-foreground">สร้างเมื่อ</p>
                <p>{formatDateTime(report.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">แก้ไขล่าสุด</p>
                <p>{formatDateTime(report.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ไฟล์รายงาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {groupedFiles.length === 0 && (
              <p className="text-sm text-muted-foreground">ไม่มีไฟล์สำหรับรายงานนี้</p>
            )}
            {groupedFiles.map(({ kind, files }) => (
              <div key={kind} className="space-y-2">
                <h3 className="text-sm font-medium">{FILE_KIND_LABELS[kind] ?? kind}</h3>
                <div className="space-y-1">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{file.file_name}</span>
                        <span className="text-xs text-muted-foreground">({formatBytes(file.file_size)})</span>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setPreviewFileId(file.id)}>
                          <Eye className="h-4 w-4 mr-1" /> ดูตัวอย่าง
                        </Button>
                        {report.acl.can_export && (
                          <Button size="sm" variant="ghost" asChild>
                            <a
                              href={`/api/reports/${reportId}/files/${file.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download className="h-4 w-4 mr-1" /> ดาวน์โหลด
                            </a>
                          </Button>
                        )}
                        {report.acl.can_print && isPdfFile(file) && (
                          <Button size="sm" variant="ghost" onClick={() => handlePrint(file.id)}>
                            <Printer className="h-4 w-4 mr-1" /> พิมพ์
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {previewFile && (
              <div className="report-print-area border-t pt-4">
                <ReportFilePreview reportId={reportId} file={previewFile} />
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>คำสั่ง SQL (Queries)</CardTitle>
              <CardDescription>สำหรับผู้ดูแลระบบเท่านั้น — เอกสารอ้างอิง ไม่ถูกรันโดยระบบ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {queries === null && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> กำลังโหลด...
                </div>
              )}
              {queries !== null && queries.length === 0 && (
                <p className="text-sm text-muted-foreground">ไม่มีคำสั่ง SQL สำหรับรายงานนี้</p>
              )}
              {queries?.map((q) => (
                <div key={q.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{q.name}</span>
                    {q.is_main && <Badge className="text-[10px]">หลัก</Badge>}
                    <span className="text-xs text-muted-foreground">v{q.version}</span>
                  </div>
                  <SqlBlock sql={q.sql_text} maxHeight="16rem" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {isAdmin && (
        <ReportPermissionsDrawer
          reportId={reportId}
          open={permissionsOpen}
          onOpenChange={setPermissionsOpen}
        />
      )}
    </ContentLayout>
  );
}
