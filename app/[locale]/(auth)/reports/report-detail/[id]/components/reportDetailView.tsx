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
import { SqlBlock } from "@/components/shared/sqlBlock";
import { ReportFilePreview, isPdfFile, type ReportFilePreviewFile } from "@/components/shared/reportFilePreview";
import { ReportPermissionsDrawer } from "@/components/shared/reportPermissionsDrawer";
import { fileKindMeta, ReportStatusPill, AccessLockIcon, categoryTint, categoryAccent } from "@/components/shared/reportDisplayMeta";
import { extractSqlStructure } from "@/lib/sql-highlight";
import { formatDateTime, cn } from "@/lib/utils";
import { Loader2, Download, Printer, Eye, ShieldCheck, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

interface ReportDetailAcl {
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_favorite: boolean;
  can_export: boolean;
  can_print: boolean;
}

interface ReportTag {
  id: string;
  name: string;
  slug: string;
}

interface ReportDetailData {
  id: string;
  code: string;
  name_th: string;
  name_en: string | null;
  description: string | null;
  author: string | null;
  report_date: string | null;
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
  tags: ReportTag[];
  is_favorited: boolean;
  acl: ReportDetailAcl;
}

interface ReportQuery {
  id: string;
  name: string;
  sql_text: string;
  is_main: boolean;
  version: string;
  sub_report_id: string | null;
}

interface ReportVariable {
  id: string;
  name: string;
  label: string | null;
  data_type: string;
  default_value: string | null;
  is_required: boolean;
  sub_report_id: string | null;
}

const FILE_KIND_ORDER = ["BLANK_FORM", "SAMPLE_FILLED_FORM", "SAMPLE_DATA", "REFERENCE_DOC"] as const;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * report_variables is scoped to the report/sub-report container (not to one
 * specific query within it), so every variable in a query's container is
 * shown - hiding a variable just because its exact `:name` spelling doesn't
 * appear in this particular query's SQL would make real, admin-entered
 * variables disappear silently. The "condition" is a best-effort lookup: the
 * first line referencing `:name` if the SQL happens to use that syntax,
 * `null` otherwise (rendered as a dash, not an error).
 */
function paramsForQuery(query: ReportQuery, variables: ReportVariable[]) {
  const lines = query.sql_text.split("\n");
  return variables
    .filter((variable) => variable.sub_report_id === query.sub_report_id)
    .map((variable) => {
      const pattern = new RegExp(`:${variable.name}\\b`);
      const line = lines.find((l) => pattern.test(l));
      return { variable, condition: line ? line.trim() : null };
    });
}

export default function ReportDetailView({ reportId, isAdmin }: { reportId: string; isAdmin: boolean }) {
  const t = useTranslations("reports.detail");
  const tc = useTranslations("common");
  const tf = useTranslations("reports.favorites");
  const tl = useTranslations("reports.list");
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [report, setReport] = React.useState<ReportDetailData | null>(null);
  const [isFavorited, setIsFavorited] = React.useState(false);
  const [favBusy, setFavBusy] = React.useState(false);
  const [queries, setQueries] = React.useState<ReportQuery[] | null>(null);
  const [variables, setVariables] = React.useState<ReportVariable[]>([]);
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
          setIsFavorited(data.is_favorited);
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
    fetch(`/api/reports/${reportId}/variables`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success) setVariables(json.data);
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

  async function handleToggleFavorite() {
    if (favBusy) return;
    setFavBusy(true);
    const next = !isFavorited;
    try {
      const res = await fetch(
        isFavorited ? `/api/reports/favorites/${reportId}` : "/api/reports/favorites",
        {
          method: isFavorited ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: isFavorited ? undefined : JSON.stringify({ report_id: reportId }),
        }
      );
      if (!res.ok) {
        toast.error(isFavorited ? tf("removeFailed") : tl("addFavoriteFailed"));
        return;
      }
      toast.success(isFavorited ? tf("removeSuccess") : tl("addFavoriteSuccess"));
      setIsFavorited(next);
    } catch {
      toast.error(isFavorited ? tf("removeFailed") : tl("addFavoriteFailed"));
    } finally {
      setFavBusy(false);
    }
  }

  if (loading) {
    return (
      <ContentLayout title={t("pageTitle")}>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> {t("loading")}
        </div>
      </ContentLayout>
    );
  }

  if (notFound || !report) {
    return (
      <ContentLayout title={t("pageTitle")}>
        <div className="py-24 text-center text-muted-foreground space-y-1">
          <p>{t("notFoundTitle")}</p>
          {adminEmail && <p className="text-sm">{t("notFoundContact", { email: adminEmail })}</p>}
        </div>
      </ContentLayout>
    );
  }

  const previewFile = report.files.find((f) => f.id === previewFileId) ?? null;
  const groupedFiles = FILE_KIND_ORDER.map((kind) => ({
    kind,
    files: report.files.filter((f) => f.file_kind === kind),
  })).filter((g) => g.files.length > 0);
  const primaryFile = report.files.find((f) => f.file_kind === "BLANK_FORM") ?? null;

  return (
    <ContentLayout title={t("pageTitle")}>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">{tc("breadcrumbDashboard")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/reports/report-list">{t("breadcrumbReports")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{report.code}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-6">
          <Card className="overflow-hidden">
            {report.categories && (
              <div className="h-1" style={{ background: categoryAccent(report.categories.id) }} />
            )}
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-1.5">
                  <div>
                    <CardTitle className="text-2xl">{report.name_th}</CardTitle>
                    {report.name_en && <CardDescription>{report.name_en}</CardDescription>}
                  </div>
                  <AccessLockIcon
                    access={report.access_level}
                    titleAccess={t(`access.${report.access_level}`)}
                    className="mt-1.5 h-4 w-4"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full font-mono font-normal">
                    {report.code}
                  </Badge>
                  <ReportStatusPill status={report.status} label={t(`status.${report.status}`)} />
                  {report.categories && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        categoryTint(report.categories.id)
                      )}
                    >
                      {report.categories.name}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.description && <p className="text-sm text-muted-foreground">{report.description}</p>}
              {report.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {report.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="font-normal text-muted-foreground">
                      #{tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("filesTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {groupedFiles.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("noFiles")}</p>
              )}
              {groupedFiles.map(({ kind, files }) => (
                <div key={kind} className="space-y-2">
                  <h3 className="text-sm font-medium">{t(`fileKind.${kind}`)}</h3>
                  <div className="space-y-1">
                    {files.map((file) => {
                      const { Icon, badgeClassName } = fileKindMeta(file);
                      return (
                        <div
                          key={file.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded", badgeClassName)}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <span>{file.file_name}</span>
                            <span className="text-xs text-muted-foreground">({formatBytes(file.file_size)})</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setPreviewFileId(file.id)}>
                              <Eye className="h-4 w-4 mr-1" /> {t("preview")}
                            </Button>
                            {report.acl.can_export && (
                              <Button size="sm" variant="ghost" asChild>
                                <a
                                  href={`/api/reports/${reportId}/files/${file.id}/download`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Download className="h-4 w-4 mr-1" /> {t("download")}
                                </a>
                              </Button>
                            )}
                            {report.acl.can_print && isPdfFile(file) && (
                              <Button size="sm" variant="ghost" onClick={() => handlePrint(file.id)}>
                                <Printer className="h-4 w-4 mr-1" /> {t("print")}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                <CardTitle>{t("queriesTitle")}</CardTitle>
                <CardDescription>{t("queriesDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {queries === null && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("loading")}
                  </div>
                )}
                {queries !== null && queries.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t("noQueries")}</p>
                )}
                {queries?.map((q) => {
                  const queryParams = paramsForQuery(q, variables);
                  const structure = extractSqlStructure(q.sql_text);
                  return (
                    <div key={q.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{q.name}</span>
                        {q.is_main && <Badge className="text-[10px]">{t("mainBadge")}</Badge>}
                        <span className="text-xs text-muted-foreground">v{q.version}</span>
                      </div>
                      <SqlBlock sql={q.sql_text} maxHeight="16rem" />
                      {(structure.selectColumns.length > 0 || structure.whereConditions.length > 0) && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {structure.selectColumns.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground">{t("selectedFieldsTitle")}</p>
                              <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-muted/50 text-muted-foreground">
                                      <th className="w-10 px-3 py-1.5 text-left font-semibold">#</th>
                                      <th className="px-3 py-1.5 text-left font-semibold">{t("fieldColumn")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {structure.selectColumns.map((col, i) => (
                                      <tr key={i} className="border-t">
                                        <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                                        <td className="px-3 py-1.5 font-mono">{col}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {structure.whereConditions.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-muted-foreground">{t("conditionsTitle")}</p>
                              <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-muted/50 text-muted-foreground">
                                      <th className="w-14 px-3 py-1.5 text-left font-semibold">{t("connectorColumn")}</th>
                                      <th className="px-3 py-1.5 text-left font-semibold">{t("conditionColumn")}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {structure.whereConditions.map((cond, i) => (
                                      <tr key={i} className="border-t">
                                        <td className="px-3 py-1.5 font-semibold text-muted-foreground">{cond.connector ?? "-"}</td>
                                        <td className="px-3 py-1.5 font-mono">{cond.text}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {queryParams.length > 0 ? (
                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full min-w-[32rem] text-xs">
                            <thead>
                              <tr className="bg-muted/50 text-muted-foreground">
                                <th className="px-3 py-1.5 text-left font-semibold">{t("paramColumn")}</th>
                                <th className="px-3 py-1.5 text-left font-semibold">{t("typeColumn")}</th>
                                <th className="px-3 py-1.5 text-left font-semibold">{t("defaultColumn")}</th>
                                <th className="px-3 py-1.5 text-left font-semibold">{t("requiredColumn")}</th>
                                <th className="px-3 py-1.5 text-left font-semibold">{t("conditionColumn")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {queryParams.map(({ variable, condition }) => (
                                <tr key={variable.id} className="border-t">
                                  <td className="px-3 py-1.5 font-mono font-medium">:{variable.name}</td>
                                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{variable.data_type}</td>
                                  <td className="px-3 py-1.5">{variable.default_value ?? "-"}</td>
                                  <td
                                    className={cn(
                                      "px-3 py-1.5 font-medium",
                                      variable.is_required ? "text-danger" : "text-muted-foreground"
                                    )}
                                  >
                                    {variable.is_required ? t("requiredYes") : t("requiredNo")}
                                  </td>
                                  <td className="px-3 py-1.5 font-mono text-muted-foreground">
                                    {condition ?? <span className="italic">{t("conditionNotFound")}</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">{t("noParams")}</p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("actionsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.acl.can_favorite && (
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-center",
                    isFavorited && "border-amber-400/50 bg-amber-50 text-amber-600 hover:bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
                  )}
                  disabled={favBusy}
                  onClick={handleToggleFavorite}
                >
                  <Star className={cn("h-4 w-4 mr-2", isFavorited && "fill-current")} />
                  {isFavorited ? tf("removeFromFavorites") : t("addFavorite")}
                </Button>
              )}
              {primaryFile && report.acl.can_export && (
                <Button variant="default" className="w-full justify-center" asChild>
                  <a
                    href={`/api/reports/${reportId}/files/${primaryFile.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="h-4 w-4 mr-2" /> {t("quickDownloadBlank")}
                  </a>
                </Button>
              )}
              {primaryFile && report.acl.can_print && isPdfFile(primaryFile) && (
                <Button variant="outline" className="w-full justify-center" onClick={() => handlePrint(primaryFile.id)}>
                  <Printer className="h-4 w-4 mr-2" /> {t("quickPrint")}
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  className="w-full justify-center border-dashed"
                  onClick={() => setPermissionsOpen(true)}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" /> {t("managePermissions")}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("quickFactsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y text-sm">
              <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-muted-foreground">{t("categoryLabel")}</span>
                <span className="font-medium">{report.categories?.name ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-muted-foreground">{t("departmentLabel")}</span>
                <span className="font-medium">{report.departments?.name ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-muted-foreground">{t("versionLabel")}</span>
                <span className="font-medium">{report.version}</span>
              </div>
              <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-muted-foreground">{t("authorLabel")}</span>
                <span className="font-medium">{report.author ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-muted-foreground">{t("reportDateLabel")}</span>
                <span className="font-medium">
                  {report.report_date ? formatDateTime(report.report_date, "DD-MM-YYYY") : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-muted-foreground">{t("viewsDownloadsLabel")}</span>
                <span className="font-medium">
                  {report.view_count} / {report.download_count}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-muted-foreground">{t("createdAtLabel")}</span>
                <span className="font-medium">{formatDateTime(report.created_at)}</span>
              </div>
              <div className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-muted-foreground">{t("updatedAtLabel")}</span>
                <span className="font-medium">{formatDateTime(report.updated_at)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
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
