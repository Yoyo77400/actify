import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['@/assets/styles/main.css'],
  // Prod: transparent proxy of the whole backend namespace to the internal
  // service. Versioning (v1, v2…) is the backend's call — the proxy never needs
  // to change. Works because Nuxt's own server endpoints live outside /api
  // (see icon.localApiEndpoint below).
  $production: {
    routeRules: {
      '/api/**': { proxy: 'http://api:3000/api/**' },
    },
  },
  // Dev: same-origin proxy to the API. The BROWSER always calls /api on its
  // own origin (localhost:3001 for `npm run dev`, localhost:8080 for Docker),
  // and Nitro forwards to the real API — so it works even when the front runs
  // in a container and the API on the host (host.docker.internal). The target
  // is env-configurable; default 127.0.0.1 for a plain host `npm run dev`.
  // 127.0.0.1, not localhost: the API binds IPv4 only, and localhost can
  // resolve to ::1 first — where an unrelated dev server may be listening.
  $development: {
    routeRules: {
      '/api/**': { proxy: `${process.env.NUXT_DEV_API_ORIGIN || 'http://127.0.0.1:3000'}/api/**` },
    },
  },
  runtimeConfig: {
    public: {
      apiBase: '/api/v1',
      // Self-hosted Umami analytics. Empty = disabled (the tracker script is
      // never injected). Overridden at runtime via NUXT_PUBLIC_UMAMI_HOST /
      // NUXT_PUBLIC_UMAMI_WEBSITE_ID (see docker-compose.prod.yml).
      umamiHost: '',
      umamiWebsiteId: '',
    },
  },
  modules: [
    '@pinia/nuxt',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/eslint',
  ],
  // Move @nuxt/icon's runtime endpoint out of /api so the backend owns /api/**.
  icon: {
    localApiEndpoint: '/_nuxt_icon',
  },
  fonts: {
    adobe: {
      id: ['hos5ftm'],
    },
    families: [
      {
        name: 'Ethnocentric',
        provider: 'adobe',
        global: true,
      },
      {
        name: 'Inter',
        provider: 'google',
        weights: [400, 500, 600, 700],
        global: true,
      },
    ],
  },
  vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        // CJS wallet SDKs: pre-bundle so their first lazy import doesn't
        // trigger a full page reload in dev.
        '@crossmarkio/sdk',
        'ripple-keypairs',
        '@gemwallet/api',
      ]
    },
    plugins: [
      tailwindcss(),
    ],
  }
})