/**
 * Doc tab "purpose" tagging (Phase 10 revision v3) — every report_files kind
 * is valid for any report regardless of output_type; the admin tags what a
 * file is *for* at upload time instead of picking from an output_type-gated
 * set. No FileKind enum rename (see document/phase10-plan.md's
 * "Implementation note") — only these display labels are new.
 */

export const FILE_PURPOSE_ORDER = ["BLANK_FORM", "SAMPLE_FILLED_FORM", "SAMPLE_DATA", "REFERENCE_DOC"] as const;
export type FilePurpose = (typeof FILE_PURPOSE_ORDER)[number];

export const FILE_PURPOSE_LABEL: Record<FilePurpose, string> = {
  BLANK_FORM: "Pre-form",
  SAMPLE_FILLED_FORM: "Preview",
  SAMPLE_DATA: "Sample Data",
  REFERENCE_DOC: "Reference doc",
};

export const FILE_PURPOSE_DESCRIPTION: Record<FilePurpose, string> = {
  BLANK_FORM: "แบบฟอร์มเปล่าไว้โหลดไปกรอก",
  SAMPLE_FILLED_FORM: "เอกสารไว้พรีวิว (เช่นตัวอย่างที่กรอกแล้ว)",
  SAMPLE_DATA: "ตัวอย่างข้อมูล (Excel/CSV)",
  REFERENCE_DOC: "เอกสารอ้างอิงอื่นๆ (มีได้หลายไฟล์)",
};

/** Only REFERENCE_DOC allows more than one current file at a time. */
export function isMultiFilePurpose(purpose: FilePurpose): boolean {
  return purpose === "REFERENCE_DOC";
}
