import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

/**
 * Namespace files merged into one messages object per locale. Kept as
 * separate files per domain (see document/phase11-plan.md) rather than one
 * giant JSON, since the whole system's strings add up to hundreds of keys.
 * Add a new namespace here whenever a new messages/{locale}/<name>.json
 * pair is introduced.
 */
const NAMESPACES = [
  "common",
  "nav",
  "auth",
  "dashboard",
  "reports",
  "reportEditor",
  "userManagement",
  "roleManagement",
  "settings",
  "tickets",
] as const;

async function loadMessages(locale: string) {
  const modules = await Promise.all(
    NAMESPACES.map((namespace) =>
      import(`../messages/${locale}/${namespace}.json`).then(
        (mod) => mod.default
      )
    )
  );

  return NAMESPACES.reduce<Record<string, unknown>>((acc, namespace, i) => {
    acc[namespace] = modules[i];
    return acc;
  }, {});
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
