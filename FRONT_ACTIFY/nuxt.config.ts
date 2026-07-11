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
  // Dev: same-origin proxy to the local API — the front runs with zero .env
  // and no CORS. NUXT_PUBLIC_API_BASE can still override apiBase if needed.
  $development: {
    routeRules: {
      '/api/**': { proxy: 'http://localhost:3000/api/**' },
    },
  },
  runtimeConfig: {
    public: {
      apiBase: '/api/v1',
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