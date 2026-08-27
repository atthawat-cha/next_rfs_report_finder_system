import * as Sentry from '@sentry/nextjs';

/**
 * Client-side Sentry init (Phase 12c) - Next.js's current file convention
 * for browser instrumentation (replaces the older sentry.client.config.ts).
 * Only initializes when NEXT_PUBLIC_SENTRY_DSN is set at build time - unset
 * (today's real state) means this module does nothing at all, so no Sentry
 * script/network activity ships to the browser.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
