"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { tokenizeSql, splitTokensIntoLines, type SqlTokenKind } from "@/lib/sql-highlight";

const KIND_CLASS: Record<SqlTokenKind, string> = {
  keyword: "text-sky-300 font-semibold",
  string: "text-emerald-300",
  number: "text-amber-300",
  comment: "text-neutral-500 italic",
  punct: "text-neutral-400",
  plain: "text-neutral-100",
};

/**
 * Read-only, highlighted SQL display. Hand-written tokenizer (lib/sql-highlight.ts)
 * instead of prismjs/shiki - this repo already carries unresolved npm audit
 * advisories it can't fix (ของค้าง #9). Colors are fixed Tailwind neutrals
 * (not the theme's --background/--foreground tokens) so the panel reads as a
 * code editor - always dark - on both the light and dark page themes, the
 * same way code blocks stay dark on GitHub/VS Code regardless of page theme.
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
  const tc = useTranslations("common");
  const [copied, setCopied] = React.useState(false);
  const lines = React.useMemo(() => splitTokensIntoLines(tokenizeSql(sql)), [sql]);

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
    <div className={cn("rounded-md border border-neutral-800 bg-neutral-900 font-mono text-xs text-neutral-100", className)}>
      <div className="flex items-center justify-end border-b border-neutral-800 px-2 py-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
          {copied ? tc("copied") : tc("copy")}
        </Button>
      </div>
      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((lineTokens, i) => (
              <tr key={i}>
                <td className="select-none w-0 pl-3 pr-3 text-right text-neutral-600 tabular-nums sticky left-0 bg-neutral-900">
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
