import { defineRouting } from "next-intl/routing";

/**
 * English is the default locale and keeps today's unprefixed URLs
 * (localePrefix: "as-needed") — only Thai gets a /th prefix. This avoids
 * invalidating any existing bookmark, DB-stored notification link, or the
 * /shares/[token] link format (see document/phase11-plan.md, "Resolved
 * decisions"). localeDetection is disabled so a first-time visitor always
 * sees English regardless of browser Accept-Language, per the same doc.
 */
export const routing = defineRouting({
  locales: ["en", "th"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
