const createNextIntlPlugin = require('next-intl/plugin')
const { withSentryConfig } = require('@sentry/nextjs')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// Phase 12c: only wrap with Sentry's build plugin / widen the CSP when a DSN
// is actually configured, so a DSN-less build (today's default) isn't
// forced to talk to Sentry's build-time API at all - see instrumentation.ts/
// instrumentation-client.ts for the matching runtime-init guard. Checks
// both vars (not just SENTRY_DSN) since SETUP.md documents them as
// independently settable - a client-only NEXT_PUBLIC_SENTRY_DSN still needs
// the CSP opened up, or instrumentation-client.ts's Sentry.init has nothing
// it can actually reach.
const sentryDsnConfigured = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lodash'],
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/assest/**'
      },
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/assest/**'
      },
    ],
  },
  async headers() {
    // See document/phase4-plan.md sub-phase 4a for the reasoning behind each
    // value, especially the CSP's 'unsafe-inline' trade-off.
    //
    // connect-src only grows to include Sentry's ingest host when Sentry is
    // actually configured (Phase 12c) - don't loosen CSP for everyone when
    // the feature is off.
    const connectSrc = sentryDsnConfigured ? "connect-src 'self' https://*.ingest.sentry.io" : "connect-src 'self'"
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            // object-src 'self' (not 'none') is required for inline PDF preview -
            // components/shared/reportFilePreview.tsx and the report-list card
            // view both render <embed type="application/pdf">, which the
            // object-src directive governs (not default-src/frame-src). This
            // was 'none' since Phase 4a and silently broke every such <embed>
            // in every browser that enforces CSP - found while wiring up a new
            // one and hitting the same "blocked by object-src 'none'" console
            // error. Still same-origin only, so no third-party embed is opened up.
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; ${connectSrc}; frame-ancestors 'none'; object-src 'self'; base-uri 'self'`,
          },
        ],
      },
      // The two routes an <embed> actually points at (reportFilePreview.tsx,
      // report-list's card view) need to be frame-able by our own pages, or
      // fixing object-src above wasn't enough - Chrome's built-in PDF viewer
      // treats an embedded PDF like nested browsing content and honors
      // X-Frame-Options/frame-ancestors on *that response*, not just the
      // page doing the embedding. DENY/'none' (the blanket rule above) tells
      // it to refuse rendering embedded anywhere, including here. A later
      // entry with a more specific `source` overrides the same header key
      // for matching paths (Next.js headers() docs), so this only relaxes
      // framing for these two file-serving endpoints - every other route,
      // including the rest of the API surface, stays at the strict default.
      {
        source: '/api/reports/:id/download',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; ${connectSrc}; frame-ancestors 'self'; object-src 'self'; base-uri 'self'`,
          },
        ],
      },
      {
        source: '/api/reports/:id/files/:fileId/download',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; ${connectSrc}; frame-ancestors 'self'; object-src 'self'; base-uri 'self'`,
          },
        ],
      },
    ];
  },
}

module.exports = sentryDsnConfigured
  ? withSentryConfig(withNextIntl(nextConfig), {
      silent: true,
      sourcemaps: { disable: true },
    })
  : withNextIntl(nextConfig)
