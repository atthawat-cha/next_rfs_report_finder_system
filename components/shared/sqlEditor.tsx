"use client";

import * as React from "react";
import { tokenizeSql, splitTokensIntoLines, type SqlTokenKind } from "@/lib/sql-highlight";
import { cn } from "@/lib/utils";

const KIND_CLASS: Record<SqlTokenKind, string> = {
  keyword: "text-chart-1 font-semibold",
  string: "text-chart-3",
  number: "text-chart-4",
  comment: "text-muted-foreground italic",
  punct: "text-foreground/70",
  plain: "text-foreground",
};

export interface SqlEditorHandle {
  insertAtCursor: (text: string) => void;
}

/**
 * Editable, line-numbered, syntax-highlighted SQL box. Renders a transparent
 * <textarea> (the real input, caret and all) directly on top of a highlighted
 * <pre> built from the same tokenizer sqlBlock.tsx uses for read-only display -
 * scroll position is kept in sync between the two on every scroll event.
 */
export const SqlEditor = React.forwardRef<SqlEditorHandle, {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  editorTheme?: "dark" | "light";
  className?: string;
}>(function SqlEditor({ value, onChange, placeholder, editorTheme = "dark", className }, ref) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const highlightRef = React.useRef<HTMLPreElement>(null);
  const gutterRef = React.useRef<HTMLDivElement>(null);

  const lines = React.useMemo(() => splitTokensIntoLines(tokenizeSql(value)), [value]);
  const lineCount = Math.max(lines.length, 1);

  React.useImperativeHandle(ref, () => ({
    insertAtCursor(text: string) {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      onChange(value.slice(0, start) + text + value.slice(end));
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + text.length;
        el.setSelectionRange(pos, pos);
      });
    },
  }), [value, onChange]);

  const handleScroll = () => {
    const el = textareaRef.current;
    if (!el) return;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = el.scrollTop;
      highlightRef.current.scrollLeft = el.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = el.scrollTop;
  };

  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-md border font-mono text-[12.5px]",
        editorTheme === "light"
          ? "bg-white text-neutral-900 border-neutral-200"
          : "bg-[#0a161d] text-neutral-100 border-[#1c2b33]",
        className
      )}
    >
      <div
        ref={gutterRef}
        aria-hidden
        className={cn(
          "flex-none w-10 select-none overflow-hidden py-2.5 text-right",
          editorTheme === "light" ? "text-neutral-400" : "text-neutral-600"
        )}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="h-[19px] px-2.5 leading-[19px]">{i + 1}</div>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <pre ref={highlightRef} aria-hidden className="pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre px-3 py-2.5 leading-[19px]">
          {lines.map((lineTokens, i) => (
            <div key={i} className="h-[19px]">
              {lineTokens.length === 0
                ? " "
                : lineTokens.map((t, ti) => (
                    <span key={ti} className={KIND_CLASS[t.kind]}>{t.text}</span>
                  ))}
            </div>
          ))}
        </pre>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          wrap="off"
          placeholder={placeholder}
          className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent px-3 py-2.5 leading-[19px] text-transparent caret-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
});
