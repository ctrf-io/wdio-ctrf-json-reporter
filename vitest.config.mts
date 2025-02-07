import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    reporters: ['default', 'junit'],
    outputFile: { junit: 'junit-reports/report.xml' },
  },
})
