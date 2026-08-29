/**
 * Zero-dependency SQL tokenizer for read-only syntax highlighting
 * (components/shared/sqlBlock.tsx). Single regex pass, no DOM/React so it is
 * unit-testable under Vitest's default "node" environment without jsdom.
 *
 * The one guarantee every caller relies on: concatenating every token's
 * `text` in order reproduces the input byte-for-byte. That's what lets the
 * loop below stay simple - any gap or leftover the regex doesn't cover is
 * filled in verbatim as a "plain" token rather than silently dropped.
 */

export type SqlTokenKind = "keyword" | "string" | "number" | "comment" | "punct" | "plain";

export interface SqlToken {
  text: string;
  kind: SqlTokenKind;
}

const SQL_KEYWORDS = new Set([
  "select", "distinct", "from", "where", "and", "or", "not", "in", "is", "null",
  "join", "inner", "left", "right", "full", "outer", "on", "using",
  "group", "by", "order", "having", "limit", "offset",
  "union", "except", "intersect", "all", "as",
  "case", "when", "then", "else", "end",
  "insert", "into", "values", "update", "set", "delete", "merge",
  "create", "table", "alter", "drop", "index", "view", "materialized", "sequence", "schema",
  "with", "recursive", "returning", "conflict", "do", "nothing",
  "between", "like", "ilike", "similar", "exists", "any", "some",
  "asc", "desc", "nulls", "first", "last",
  "count", "sum", "avg", "min", "max", "coalesce", "cast", "extract",
  "primary", "key", "foreign", "references", "default", "constraint", "unique", "check",
  "trigger", "function", "returns", "declare", "begin", "commit", "rollback", "transaction",
  "grant", "revoke", "cascade", "restrict", "truncate",
  "over", "partition", "filter", "window", "lateral", "cross", "natural",
  "true", "false", "unknown",
  "array", "row", "interval", "date", "timestamp", "time", "zone",
  "numeric", "integer", "bigint", "smallint", "varchar", "char", "text", "boolean", "json", "jsonb", "uuid",
  "generated", "always", "stored", "if",
]);

const TOKEN_PATTERN = new RegExp(
  [
    "(--[^\\n]*)", // 1: line comment
    "(/\\*[\\s\\S]*?(?:\\*/|$))", // 2: block comment (unterminated -> runs to EOF)
    "('(?:[^']|'')*'?)", // 3: single-quoted string, '' escape (unterminated -> runs to EOF)
    "(\\d+(?:\\.\\d+)?)", // 4: number
    "([A-Za-z_][A-Za-z0-9_]*)", // 5: identifier / keyword
    "(\\s+)", // 6: whitespace
    "([^\\sA-Za-z0-9_']+)", // 7: punctuation / operators
  ].join("|"),
  "g"
);

export function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  if (!sql) return tokens;

  TOKEN_PATTERN.lastIndex = 0;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = TOKEN_PATTERN.exec(sql)) !== null) {
    if (match.index > cursor) {
      // The regex should be exhaustive, but if some character sequence ever
      // slips through unmatched, keep it rather than silently dropping it.
      tokens.push({ text: sql.slice(cursor, match.index), kind: "plain" });
    }

    const [, lineComment, blockComment, str, num, word, ws] = match;
    const text = match[0];

    if (lineComment !== undefined || blockComment !== undefined) {
      tokens.push({ text, kind: "comment" });
    } else if (str !== undefined) {
      tokens.push({ text, kind: "string" });
    } else if (num !== undefined) {
      tokens.push({ text, kind: "number" });
    } else if (word !== undefined) {
      tokens.push({ text, kind: SQL_KEYWORDS.has(word.toLowerCase()) ? "keyword" : "plain" });
    } else if (ws !== undefined) {
      tokens.push({ text, kind: "plain" });
    } else {
      tokens.push({ text, kind: "punct" });
    }

    cursor = match.index + text.length;

    if (text.length === 0) {
      // Every alternative requires at least one character, so this should
      // be unreachable - but a zero-length match would spin forever, so
      // force progress rather than trust that invariant blindly.
      cursor += 1;
      TOKEN_PATTERN.lastIndex = cursor;
    }
  }

  if (cursor < sql.length) {
    tokens.push({ text: sql.slice(cursor), kind: "plain" });
  }

  return tokens;
}

/** Splits a flat token stream back into per-line token arrays, for line-numbered rendering. */
export function splitTokensIntoLines(tokens: SqlToken[]): SqlToken[][] {
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
