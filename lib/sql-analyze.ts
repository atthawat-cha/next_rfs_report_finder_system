/**
 * Best-effort SQL "analyzer" — extracts the tables, fields, and conditions a
 * `report_queries.sql_text` row touches, for a compact summary in the Query
 * tab instead of always showing the full SQL inline (Phase 10 revision v2).
 *
 * This is NOT a real SQL parser (no AST, no dialect awareness) — same stance
 * as lib/sql-highlight.ts's hand-written tokenizer: this repo already carries
 * unresolved npm audit advisories it can't fix, so a real parsing dependency
 * isn't worth adding for a display aid. Regex/scan-based, single-statement,
 * SELECT-shaped queries only (which is all report_queries ever stores — see
 * system-design.md §5.2, these are reference/documentation text, never run).
 * Anything it can't confidently read comes back as `ok: false` so the caller
 * falls back to showing the full SQL instead of a wrong-looking empty state.
 */

export interface SqlAnalysis {
  ok: boolean;
  tables: string[];
  fields: string[];
  conditions: string[];
}

const EMPTY: SqlAnalysis = { ok: false, tables: [], fields: [], conditions: [] };

/** Strips -- line comments and /* block comments so keyword scans don't match inside them. */
function stripComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?(?:\*\/|$)/g, "");
}

/**
 * Splits `text` on top-level occurrences of `delimiter` (a literal character
 * like "," or a case-insensitive whole word like "and"/"or"), ignoring
 * anything inside (parens) or 'single quoted strings'.
 */
function splitTopLevel(text: string, delimiter: string): string[] {
  const isWordDelim = /^[A-Za-z]+$/.test(delimiter);
  const wordLower = delimiter.toLowerCase();
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let start = 0;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      if (ch === "'") inString = false;
      i += 1;
      continue;
    }
    if (ch === "'") {
      inString = true;
      i += 1;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }

    if (depth === 0) {
      if (!isWordDelim && ch === delimiter) {
        parts.push(text.slice(start, i));
        i += 1;
        start = i;
        continue;
      }
      if (isWordDelim) {
        const isBoundaryBefore = i === 0 || !/[A-Za-z0-9_]/.test(text[i - 1]);
        const slice = text.slice(i, i + wordLower.length).toLowerCase();
        const isBoundaryAfter = !/[A-Za-z0-9_]/.test(text[i + wordLower.length] ?? " ");
        if (isBoundaryBefore && isBoundaryAfter && slice === wordLower) {
          parts.push(text.slice(start, i));
          i += wordLower.length;
          start = i;
          continue;
        }
      }
    }
    i += 1;
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/**
 * Splits a WHERE-clause region on top-level AND/OR, except an AND that
 * belongs to a preceding BETWEEN x AND y (that AND isn't a conjunction
 * between two conditions, it's part of BETWEEN's own syntax).
 */
function splitConditions(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let pendingBetween = 0;
  let start = 0;
  let i = 0;

  const matchWord = (word: string): boolean => {
    const isBoundaryBefore = i === 0 || !/[A-Za-z0-9_]/.test(text[i - 1]);
    const slice = text.slice(i, i + word.length).toLowerCase();
    const isBoundaryAfter = !/[A-Za-z0-9_]/.test(text[i + word.length] ?? " ");
    return isBoundaryBefore && isBoundaryAfter && slice === word;
  };

  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      if (ch === "'") inString = false;
      i += 1;
      continue;
    }
    if (ch === "'") {
      inString = true;
      i += 1;
      continue;
    }
    if (ch === "(") {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }

    if (depth === 0 && /[A-Za-z]/.test(ch)) {
      if (matchWord("between")) {
        pendingBetween += 1;
        i += 7;
        continue;
      }
      if (matchWord("and")) {
        if (pendingBetween > 0) {
          pendingBetween -= 1;
          i += 3;
          continue;
        }
        parts.push(text.slice(start, i));
        i += 3;
        start = i;
        continue;
      }
      if (matchWord("or")) {
        parts.push(text.slice(start, i));
        i += 2;
        start = i;
        continue;
      }
    }
    i += 1;
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

function extractRegion(sql: string, afterKeyword: RegExp, stopKeywords: RegExp): string | null {
  const afterMatch = afterKeyword.exec(sql);
  if (!afterMatch) return null;
  const rest = sql.slice(afterMatch.index + afterMatch[0].length);
  const stopMatch = stopKeywords.exec(rest);
  const region = stopMatch ? rest.slice(0, stopMatch.index) : rest;
  return region.trim();
}

/** First identifier (with optional alias) out of a FROM/JOIN table reference, e.g. "reports r" -> "reports r". */
function cleanTableRef(ref: string): string {
  return ref.replace(/\s+/g, " ").replace(/\bON\b[\s\S]*$/i, "").trim();
}

export function analyzeSql(sql: string): SqlAnalysis {
  if (!sql || !sql.trim()) return EMPTY;

  const cleaned = stripComments(sql);
  if (!/\bselect\b/i.test(cleaned) || !/\bfrom\b/i.test(cleaned)) {
    return EMPTY;
  }

  try {
    const fieldsRegion = extractRegion(
      cleaned,
      /\bselect\b(\s+distinct\b)?/i,
      /\bfrom\b/i
    );
    const fields = fieldsRegion ? splitTopLevel(fieldsRegion, ",").map((f) => f.replace(/\s+/g, " ")) : [];

    const fromRegion = extractRegion(
      cleaned,
      /\bfrom\b/i,
      /\bwhere\b|\bgroup\s+by\b|\border\s+by\b|\bhaving\b|\blimit\b/i
    );
    const tables = fromRegion
      ? splitTopLevel(fromRegion, ",")
          .flatMap((part) => splitTopLevel(part, "join"))
          .map(cleanTableRef)
          .filter(Boolean)
      : [];

    const whereRegion = extractRegion(
      cleaned,
      /\bwhere\b/i,
      /\bgroup\s+by\b|\border\s+by\b|\bhaving\b|\blimit\b/i
    );
    const conditions = whereRegion
      ? splitConditions(whereRegion).map((c) => c.replace(/\s+/g, " "))
      : [];

    if (tables.length === 0 && fields.length === 0) return EMPTY;

    return { ok: true, tables, fields, conditions };
  } catch {
    return EMPTY;
  }
}
