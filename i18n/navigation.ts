import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware replacements for next/link and next/navigation, scoped to
 * the routing config above. Use these (not the plain next/* versions)
 * anywhere inside the app/[locale] tree so a Thai-session user doesn't
 * silently fall back to an unprefixed (English) URL when navigating.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
