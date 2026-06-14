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
  modules: [
    '@pinia/nuxt',
    '@nuxt/fonts',
    '@nuxt/icon',
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
      ]
    },
    plugins: [
      tailwindcss(),
    ],
  }
})