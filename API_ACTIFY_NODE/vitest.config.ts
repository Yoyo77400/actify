import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // utils/jwt.ts throws at import time without a secret.
    env: { JWT_SECRET: 'vitest-secret' },
  },
})
