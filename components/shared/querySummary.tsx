"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { SqlBlock } from "@/components/shared/sqlBlock";
import { analyzeSql } from "@/lib/sql-analyze";
import { cn } from "@/lib/utils";

function ChipRow({ label, chips, className }: { label: string; chips: string[]; className?: string }) {
  return (
    <div className="flex gap-2 items-start text-xs">
      <span className="flex-none w-16 pt-0.5 font-medium text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {chips.length === 0 ? (
          <span className="text-muted-foreground/70">— ไม่มี</span>
        ) : (
          chips.map((chip, i) => (
            <span key={i} className={cn("font-mono rounded px-1.5 py-0.5 text-[11px]", className)}>
              {chip}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Compact tables/fields/conditions summary for a report_queries row, with
 * the full SqlBlock available behind a toggle - replaces always-inline
 * SqlBlock (Phase 10 revision v2: full SQL made every query row too wide).
 */
export function QuerySummary({ sql, maxHeight = "16rem" }: { sql: string; maxHeight?: string }) {
  const [showFull, setShowFull] = React.useState(false);
  const analysis = React.useMemo(() => analyzeSql(sql), [sql]);

  if (!analysis.ok) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground italic">ไม่สามารถวิเคราะห์ SQL นี้ได้ ดู SQL เต็มแทน</p>
        <SqlBlock sql={sql} maxHeight={maxHeight} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <ChipRow label="ตาราง" chips={analysis.tables} className="bg-chart-1/10 text-chart-1" />
        <ChipRow label="ฟิลด์" chips={analysis.fields} className="bg-muted text-foreground" />
        <ChipRow label="เงื่อนไข" chips={analysis.conditions} className="bg-chart-4/10 text-chart-4" />
      </div>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto p-0 text-xs"
        onClick={() => setShowFull((v) => !v)}
      >
        {showFull ? "ซ่อน SQL เต็ม" : "ดู SQL เต็ม"}
      </Button>
      {showFull && <SqlBlock sql={sql} maxHeight={maxHeight} />}
    </div>
  );
}
