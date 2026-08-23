import { describe, expect, it } from "vitest";
import { analyzeSql } from "./sql-analyze";

describe("lib/sql-analyze", () => {
  it("extracts tables, fields, and conditions from a normal query", () => {
    const result = analyzeSql(
      `SELECT d.department_name, SUM(u.dose_amount) AS total_dose
       FROM anesthesia_usage u
       JOIN departments d ON d.id = u.department_id
       WHERE u.used_at BETWEEN :start_date AND :end_date
       GROUP BY d.department_name`
    );
    expect(result.ok).toBe(true);
    expect(result.tables).toEqual(["anesthesia_usage u", "departments d"]);
    expect(result.fields).toEqual(["d.department_name", "SUM(u.dose_amount) AS total_dose"]);
    expect(result.conditions).toEqual(["u.used_at BETWEEN :start_date AND :end_date"]);
  });

  it("returns an empty conditions array when there's no WHERE clause", () => {
    const result = analyzeSql("SELECT drug_name, COUNT(*) FROM anesthesia_usage GROUP BY drug_name");
    expect(result.ok).toBe(true);
    expect(result.tables).toEqual(["anesthesia_usage"]);
    expect(result.conditions).toEqual([]);
  });

  it("splits multiple AND/OR conditions into separate chips", () => {
    const result = analyzeSql(
      "SELECT * FROM reports WHERE status = 'PUBLISHED' AND (access_level = 'PUBLIC' OR department_id = :dept)"
    );
    expect(result.ok).toBe(true);
    expect(result.conditions).toEqual([
      "status = 'PUBLISHED'",
      "(access_level = 'PUBLIC' OR department_id = :dept)",
    ]);
  });

  it("falls back to ok:false for non-SELECT statements instead of guessing", () => {
    expect(analyzeSql("UPDATE reports SET status = 'ARCHIVED' WHERE id = :id").ok).toBe(false);
    expect(analyzeSql("DELETE FROM reports WHERE id = :id").ok).toBe(false);
  });

  it("falls back to ok:false for empty or garbage input without throwing", () => {
    expect(analyzeSql("").ok).toBe(false);
    expect(analyzeSql("not sql at all").ok).toBe(false);
    expect(() => analyzeSql("SELECT (((unbalanced FROM x")).not.toThrow();
  });
});
