"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Two-locale toggle (EN/TH), same interaction pattern as ModeToggle.
 * Switching sets next-intl's NEXT_LOCALE cookie automatically (via the
 * locale-aware router) so the choice persists across visits without a
 * separate store - see document/phase11-plan.md.
 */
export function LocaleToggle() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

  const nextLocale = locale === "en" ? "th" : "en";
  const label = locale === "en" ? t("languageEnglish") : t("languageThai");

  const handleToggle = () => {
    router.push(pathname, { locale: nextLocale });
  };

  return (
    <TooltipProvider disableHoverableContent>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <Button
            className="rounded-full h-8 px-3 bg-background mr-2 text-xs font-semibold uppercase"
            variant="outline"
            onClick={handleToggle}
            data-testid="locale-toggle"
          >
            {locale}
            <span className="sr-only">{t("language")}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
