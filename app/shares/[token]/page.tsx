"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Download } from "lucide-react";

interface SharedReport {
  id: string;
  code: string;
  name_th: string;
  name_en: string | null;
  description: string | null;
  output_type: string;
}

interface SharedFile {
  id: string | null;
  file_kind: string;
  file_path: string;
  file_name: string;
}

export default function SharedReportPage() {
  const params = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SharedReport | null>(null);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [canDownload, setCanDownload] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/shares/${params.token}`);
        const json = await res.json();
        if (!res.ok || !json?.success) {
          setError(json?.error ?? "ไม่พบลิงก์นี้");
          return;
        }
        setReport(json.data.report);
        setFiles(json.data.files ?? []);
        setCanDownload(json.data.can_download);
      } catch {
        setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        {loading ? (
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        ) : error || !report ? (
          <>
            <CardHeader>
              <CardTitle>ไม่สามารถเข้าถึงรายงานนี้ได้</CardTitle>
              <CardDescription>{error ?? "ลิงก์นี้ไม่ถูกต้องหรือหมดอายุแล้ว"}</CardDescription>
            </CardHeader>
          </>
        ) : (
          <>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle>{report.name_th}</CardTitle>
              </div>
              <CardDescription>{report.code}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.description && <p className="text-sm text-muted-foreground">{report.description}</p>}

              {canDownload ? (
                files.length > 0 ? (
                  <div className="space-y-2">
                    {files.map((f) => (
                      <a
                        key={f.id ?? f.file_path}
                        // report_files-backed entries (id set) go through the
                        // token-gated download endpoint so they still resolve
                        // correctly regardless of UPLOAD_BASE_PATH; the legacy
                        // reports.file_path fallback (id null) always lives
                        // under public/ so a raw static link still works.
                        href={f.id ? `/api/shares/${params.token}/files/${f.id}/download` : f.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between text-sm bg-muted/40 rounded px-3 py-2 hover:bg-muted"
                      >
                        <span className="truncate">{f.file_name}</span>
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">ยังไม่มีไฟล์สำหรับรายงานนี้</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">ลิงก์นี้ไม่อนุญาตให้ดาวน์โหลดไฟล์</p>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
