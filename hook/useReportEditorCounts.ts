"use client";

import { useCallback, useEffect, useState } from "react";

export interface ReportEditorCounts {
  param: number;
  queryMain: number;
  querySub: number;
  sub: number;
}

const EMPTY_COUNTS: ReportEditorCounts = { param: 0, queryMain: 0, querySub: 0, sub: 0 };

/**
 * Lightweight counts shown on the Param/Query/Sub tab labels (e.g. "Query
 * 1+3" = 1 main + 3 sub queries). Separate from each tab's own self-fetch
 * (components/reportEditor/*) since the parent shell needs these numbers
 * even while a tab isn't mounted — pass `refresh` as that tab's
 * `onDataChange` so the badge stays in sync after any add/edit/delete.
 */
export function useReportEditorCounts(reportId: string | null) {
  const [counts, setCounts] = useState<ReportEditorCounts>(EMPTY_COUNTS);

  const refresh = useCallback(async () => {
    if (!reportId) {
      setCounts(EMPTY_COUNTS);
      return;
    }
    const [varsRes, queriesRes, subsRes] = await Promise.all([
      fetch(`/api/reports/${reportId}/variables`, { credentials: "include" }),
      fetch(`/api/reports/${reportId}/queries`, { credentials: "include" }),
      fetch(`/api/reports/${reportId}/sub-reports`, { credentials: "include" }),
    ]);
    const vars = varsRes.ok ? await varsRes.json() : null;
    const queries = queriesRes.ok ? await queriesRes.json() : null;
    const subs = subsRes.ok ? await subsRes.json() : null;
    const queryRows: { is_main: boolean }[] = queries?.success ? queries.data : [];

    setCounts({
      param: vars?.success ? vars.data.length : 0,
      queryMain: queryRows.filter((q) => q.is_main).length,
      querySub: queryRows.filter((q) => !q.is_main).length,
      sub: subs?.success ? subs.data.length : 0,
    });
  }, [reportId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { counts, refresh };
}
