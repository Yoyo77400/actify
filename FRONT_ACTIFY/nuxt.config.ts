import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['@/assets/styles/main.css'],
  // Production only: the Nitro server proxies /api/* to the internal API
  // service (docker network actify-prod). The API is never exposed directly.
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