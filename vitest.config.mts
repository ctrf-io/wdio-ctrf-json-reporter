import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    reporters: ['default', 'vitest-ctrf-json-reporter'],
    }
})
