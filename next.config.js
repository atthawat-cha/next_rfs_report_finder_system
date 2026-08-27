const createNextIntlPlugin = require('next-intl/plugin')
const { withSentryConfig } = require('@sentry/nextjs')

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// Phase 12c: only wrap with Sentry's build plugin when a DSN is actually
// configured, so a DSN-less build (today's default) isn't forced to talk to
// Sentry's build-time API at all - see instrumentation.ts/
// instrumentation-client.ts for the matching runtime-init guard.
const sentryDsnConfigured = Boolean(process.env.SENTRY_DSN)

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
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        {
          key: 'Content-Security-Policy',
          value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; ${connectSrc}; frame-ancestors 'none'; object-src 'none'; base-uri 'self'`,
        },
      ],
    }];
  },
}

module.exports = sentryDsnConfigured
  ? withSentryConfig(withNextIntl(nextConfig), {
      silent: true,
      sourcemaps: { disable: true },
    })
  : withNextIntl(nextConfig)
