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

/**
 * Descriptions are prose (unlike the short FILE_PURPOSE_LABEL tags above,
 * which stay untranslated by design - same convention as the Info/Param/
 * Query/Sub/Doc tab labels), so they come from the "reports.filePurpose"
 * message namespace instead of a hardcoded Thai record - pass the `t`
 * from useTranslations("reports.filePurpose").
 */
export function getFilePurposeDescription(t: (key: string) => string, purpose: FilePurpose): string {
  return t(`${purpose}.description`);
}

/** Only REFERENCE_DOC allows more than one current file at a time. */
export function isMultiFilePurpose(purpose: FilePurpose): boolean {
  return purpose === "REFERENCE_DOC";
}
