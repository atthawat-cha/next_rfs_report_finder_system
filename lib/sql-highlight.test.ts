import { describe, expect, it } from "vitest";
import { extractSqlStructure, tokenizeSql } from "./sql-highlight";

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

describe("lib/sql-highlight extractSqlStructure", () => {
  it("splits simple SELECT columns and a single WHERE condition", () => {
    const sql = `SELECT
    c.name AS customer_name,
    o.id AS order_id,
    oi.product_name,
    oi.quantity
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'COMPLETED';`;
    const result = extractSqlStructure(sql);
    expect(result.selectColumns).toEqual([
      "c.name AS customer_name",
      "o.id AS order_id",
      "oi.product_name",
      "oi.quantity",
    ]);
    expect(result.whereConditions).toEqual([{ connector: null, text: "o.status = 'COMPLETED'" }]);
  });

  it("does not split on commas or AND/OR nested inside function-call parens", () => {
    const sql = `SELECT region, SUM(sale_amount) AS total_sales, COALESCE(a, b) AS coalesced
FROM sales_transactions
WHERE sale_month = :month AND (region = 'north' OR region = 'south')
GROUP BY region;`;
    const result = extractSqlStructure(sql);
    expect(result.selectColumns).toEqual(["region", "SUM(sale_amount) AS total_sales", "COALESCE(a, b) AS coalesced"]);
    expect(result.whereConditions).toEqual([
      { connector: null, text: "sale_month = :month" },
      { connector: "AND", text: "(region = 'north' OR region = 'south')" },
    ]);
  });

  it("stops the WHERE clause at GROUP BY/ORDER BY/LIMIT", () => {
    const sql = "SELECT a FROM t WHERE a > 1 ORDER BY a LIMIT 10;";
    const result = extractSqlStructure(sql);
    expect(result.whereConditions).toEqual([{ connector: null, text: "a > 1" }]);
  });

  it("handles SELECT * and no WHERE clause", () => {
    const result = extractSqlStructure("SELECT * FROM reports;");
    expect(result.selectColumns).toEqual(["*"]);
    expect(result.whereConditions).toEqual([]);
  });

  it("returns empty results for SQL with no top-level SELECT/FROM", () => {
    expect(extractSqlStructure("")).toEqual({ selectColumns: [], whereConditions: [] });
    expect(extractSqlStructure("UPDATE reports SET status = 'DRAFT';")).toEqual({
      selectColumns: [],
      whereConditions: [],
    });
  });

  it("ignores keywords and commas inside string literals and comments", () => {
    const sql = "SELECT 'a, b AND c' AS x -- FROM here WHERE nope\nFROM t WHERE x = 1;";
    const result = extractSqlStructure(sql);
    expect(result.selectColumns).toEqual(["'a, b AND c' AS x"]);
    expect(result.whereConditions).toEqual([{ connector: null, text: "x = 1" }]);
  });
});
