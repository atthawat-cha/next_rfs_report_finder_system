"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALES = ["en", "th"] as const;

/**
 * Two-button locale pill (EN | TH both visible, current one highlighted).
 * Switching sets next-intl's NEXT_LOCALE cookie automatically (via the
 * locale-aware router) so the choice persists across visits without a
 * separate store - see document/phase11-plan.md.
 *
 * `data-testid="locale-toggle"` lands on whichever button is NOT the current
 * locale (the "switch to X" action) - this preserves e2e/locale-switch.spec.ts's
 * `getByTestId('locale-toggle').click()` contract from the single-button
 * version this replaced, without needing to touch the spec.
 */
export function LocaleToggle() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = (next: (typeof LOCALES)[number]) => {
    if (next === locale) return;
    router.push(pathname, { locale: next });
  };

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="mr-2 inline-flex items-center gap-0.5 rounded-full border bg-background p-0.5"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => handleSelect(l)}
          aria-pressed={locale === l}
          title={l === "en" ? t("languageEnglish") : t("languageThai")}
          data-testid={locale === l ? undefined : "locale-toggle"}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase transition-colors",
            locale === l
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
