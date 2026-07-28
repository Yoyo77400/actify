import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      // utils/jwt.ts throws at import time without a secret.
      JWT_SECRET: 'vitest-secret',
      // utils/public-url.ts has no fallback by design (see its doc comment).
      PUBLIC_BASE_URL: 'https://actify.test',
    },
  },
})
