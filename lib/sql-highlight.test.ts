import { describe, expect, it } from "vitest";
import { tokenizeSql } from "./sql-highlight";

function reconstruct(sql: string): string {
  return tokenizeSql(sql)
    .map((t) => t.text)
    .join("");
}

describe("lib/sql-highlight", () => {
  it("returns no tokens for empty input", () => {
    expect(tokenizeSql("")).toEqual([]);
  });

  it("round-trips arbitrary SQL byte-for-byte", () => {
    const samples = [
      "SELECT * FROM reports WHERE id = 1;",
      "SELECT name_th, code FROM reports r JOIN categories c ON c.id = r.category_id ORDER BY r.created_at DESC;",
      "-- a trailing comment with no newline",
      "/* unterminated block comment",
      "'unterminated string",
      "SELECT '' AS empty_string, 'it''s escaped' AS quoted;",
      "SELECT 1.5, 42, -3 FROM x;",
      "",
      "   \t\n  ",
      "SELECT `weird` \"quoted ident\" # not real sql but must not crash;",
    ];
    for (const sql of samples) {
      expect(reconstruct(sql)).toBe(sql);
    }
  });

  it("does not classify a keyword inside a string literal as a keyword", () => {
    const tokens = tokenizeSql("SELECT 'FROM WHERE SELECT' AS x");
    const stringToken = tokens.find((t) => t.kind === "string");
    expect(stringToken?.text).toBe("'FROM WHERE SELECT'");
    const keywordTexts = tokens.filter((t) => t.kind === "keyword").map((t) => t.text.toLowerCase());
    expect(keywordTexts).toEqual(["select", "as"]);
  });

  it("does not classify a keyword inside a line comment as a keyword", () => {
    const tokens = tokenizeSql("-- SELECT * FROM reports\nSELECT 1;");
    const commentToken = tokens.find((t) => t.kind === "comment");
    expect(commentToken?.text).toBe("-- SELECT * FROM reports");
    const keywordCount = tokens.filter((t) => t.kind === "keyword").length;
    expect(keywordCount).toBe(1); // only the real SELECT on the second line
  });

  it("does not classify a keyword inside a block comment as a keyword", () => {
    const tokens = tokenizeSql("/* SELECT FROM WHERE */ SELECT 1;");
    const commentToken = tokens.find((t) => t.kind === "comment");
    expect(commentToken?.text).toBe("/* SELECT FROM WHERE */");
    const keywordTexts = tokens.filter((t) => t.kind === "keyword").map((t) => t.text.toLowerCase());
    expect(keywordTexts).toEqual(["select"]);
  });

  it("handles an unterminated string at EOF without looping or throwing", () => {
    expect(() => tokenizeSql("SELECT 'abc")).not.toThrow();
    const tokens = tokenizeSql("SELECT 'abc");
    const stringToken = tokens.find((t) => t.kind === "string");
    expect(stringToken?.text).toBe("'abc");
  });

  it("handles an unterminated block comment at EOF without looping or throwing", () => {
    expect(() => tokenizeSql("SELECT 1 /* never closed")).not.toThrow();
    const tokens = tokenizeSql("SELECT 1 /* never closed");
    const commentToken = tokens.find((t) => t.kind === "comment");
    expect(commentToken?.text).toBe("/* never closed");
  });

  it("classifies numbers and punctuation distinctly from keywords", () => {
    const tokens = tokenizeSql("WHERE id >= 42");
    expect(tokens.map((t) => t.kind)).toEqual([
      "keyword", // WHERE
      "plain", // space
      "plain", // id
      "plain", // space
      "punct", // >=
      "plain", // space
      "number", // 42
    ]);
  });
});
