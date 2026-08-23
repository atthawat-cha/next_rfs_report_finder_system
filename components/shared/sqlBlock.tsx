"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { tokenizeSql, type SqlToken, type SqlTokenKind } from "@/lib/sql-highlight";

const KIND_CLASS: Record<SqlTokenKind, string> = {
  keyword: "text-chart-1 font-semibold",
  string: "text-chart-3",
  number: "text-chart-4",
  comment: "text-muted-foreground italic",
  punct: "text-foreground/70",
  plain: "text-foreground",
};

function splitIntoLines(tokens: SqlToken[]): SqlToken[][] {
  const lines: SqlToken[][] = [[]];
  for (const token of tokens) {
    const parts = token.text.split("\n");
    parts.forEach((part, idx) => {
      if (idx > 0) lines.push([]);
      if (part.length > 0) lines[lines.length - 1].push({ text: part, kind: token.kind });
    });
  }
  return lines;
}

/**
 * Read-only, highlighted SQL display. Hand-written tokenizer (lib/sql-highlight.ts)
 * instead of prismjs/shiki - this repo already carries unresolved npm audit
 * advisories it can't fix (ของค้าง #9), and colours come from Tailwind theme
 * tokens (text-chart-*) so light/dark both stay correct for free.
 */
export function SqlBlock({
  sql,
  maxHeight = "24rem",
  className,
}: {
  sql: string;
  maxHeight?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const lines = React.useMemo(() => splitIntoLines(tokenizeSql(sql)), [sql]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (non-secure context, permissions) - leave the button as-is.
    }
  };

  return (
    <div className={cn("rounded-md border bg-muted/40 font-mono text-xs", className)}>
      <div className="flex items-center justify-end border-b px-2 py-1">
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
          {copied ? "คัดลอกแล้ว" : "คัดลอก"}
        </Button>
      </div>
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((lineTokens, i) => (
              <tr key={i}>
                <td className="select-none w-0 pl-3 pr-3 text-right text-muted-foreground/60 tabular-nums">
                  {i + 1}
                </td>
                <td className="whitespace-pre pr-4">
                  {lineTokens.length === 0
                    ? " "
                    : lineTokens.map((t, ti) => (
                        <span key={ti} className={KIND_CLASS[t.kind]}>
                          {t.text}
                        </span>
                      ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
