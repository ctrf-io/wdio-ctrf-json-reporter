import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { getRunnerForSuite, SUITES } from './testdata'
import GenerateCtrfReport from '../src'
import * as fs from 'fs'

let tmpReporter: GenerateCtrfReport

describe('GenerateCtrfReport', () => {
  beforeAll(() => {
    fs.rmSync('ctrf', { recursive: true, force: true })
  })
  describe('test output', () => {
    describe('passed spec', () => {
      const suite = Object.values(SUITES)[0]
      beforeEach(() => {
        tmpReporter = new GenerateCtrfReport()
        tmpReporter.onSuiteStart(suite as any)
      })

      test('passed suite', () => {
        tmpReporter.onTestEnd(suite.tests[0] as any)
        tmpReporter.onTestEnd(suite.tests[1] as any)

        tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

        expect(tmpReporter.ctrfReport.results.summary.passed).toBe(2)
        expect(tmpReporter.ctrfReport.results.summary.failed).toBe(0)
        expect(tmpReporter.ctrfReport.results.summary.skipped).toBe(0)

        expect(tmpReporter.ctrfReport.results.tests[0].status).toBe('passed')
        expect(tmpReporter.ctrfReport.results.tests[0].flaky).toBe(false)
        expect(tmpReporter.ctrfReport.results.tests[0].retries).toBe(0)

        expect(tmpReporter.ctrfReport.results.tests[1].status).toBe('passed')
        expect(tmpReporter.ctrfReport.results.tests[1].flaky).toBe(false)
        expect(tmpReporter.ctrfReport.results.tests[1].retries).toBe(0)
        expect(tmpReporter.ctrfReport.results).toMatchSnapshot()
      })
    })

    describe('retry spec', () => {
      const suite = Object.values(SUITES)[1]
      const test0 = suite.tests[0]
      const test1 = suite.tests[1]
      const test2 = suite.tests[2]

      beforeEach(() => {
        tmpReporter = new GenerateCtrfReport()
        tmpReporter.onSuiteStart(suite as any)
      })

      test('first run - 1 passed, 2 failures, 0 flaky', () => {
        tmpReporter.onTestEnd(test0 as any)
        tmpReporter.onTestEnd(test1 as any)
        tmpReporter.onTestEnd(test2 as any)
        tmpReporter.onRunnerEnd(getRunnerForSuite(suite))
        expect(tmpReporter.ctrfReport.results.summary.passed).toBe(1)
        expect(tmpReporter.ctrfReport.results.summary.failed).toBe(2)

        expect(tmpReporter.ctrfReport.results.tests[0].status).toBe('passed')
        expect(tmpReporter.ctrfReport.results.tests[0].flaky).toBe(false)
        expect(tmpReporter.ctrfReport.results.tests[0].retries).toBe(0)

        expect(tmpReporter.ctrfReport.results.tests[1].status).toBe('failed')
        expect(tmpReporter.ctrfReport.results.tests[1].flaky).toBe(false)
        expect(tmpReporter.ctrfReport.results.tests[1].retries).toBe(0)

        expect(tmpReporter.ctrfReport.results.tests[2].status).toBe('failed')
        expect(tmpReporter.ctrfReport.results.tests[2].flaky).toBe(false)
        expect(tmpReporter.ctrfReport.results.tests[2].retries).toBe(0)

        expect(tmpReporter.ctrfReport.results).toMatchSnapshot()
      })

      test('second run - 2 passed, 1 failure, 1 flaky', () => {
        tmpReporter.onTestEnd(test0 as any)
        tmpReporter.onTestEnd({ ...test1, state: 'passed' } as any)
        tmpReporter.onTestEnd(test2 as any)
        tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

        expect(tmpReporter.ctrfReport.results.summary.passed).toBe(2)
        expect(tmpReporter.ctrfReport.results.summary.failed).toBe(1)

        expect(tmpReporter.ctrfReport.results.tests[0].status).toBe('passed')
        expect(tmpReporter.ctrfReport.results.tests[0].flaky).toBe(false)
        expect(tmpReporter.ctrfReport.results.tests[0].retries).toBe(0)

        expect(tmpReporter.ctrfReport.results.tests[1].status).toBe('passed')
        expect(tmpReporter.ctrfReport.results.tests[1].flaky).toBe(true)
        expect(tmpReporter.ctrfReport.results.tests[1].retries).toBe(1)

        expect(tmpReporter.ctrfReport.results.tests[2].status).toBe('failed')
        expect(tmpReporter.ctrfReport.results.tests[2].flaky).toBe(true)
        expect(tmpReporter.ctrfReport.results.tests[2].retries).toBe(1)

        expect(tmpReporter.ctrfReport.results).toMatchSnapshot()
      })

      test('third run - 3 passes, 0 failures, 2 flaky', () => {
        tmpReporter.onTestEnd(test0 as any)
        tmpReporter.onTestEnd({ ...test1, state: 'passed' } as any)
        tmpReporter.onTestEnd({ ...test2, state: 'passed' } as any)
        tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

        expect(tmpReporter.ctrfReport.results.summary.passed).toBe(3)
        expect(tmpReporter.ctrfReport.results.summary.failed).toBe(0)

        expect(tmpReporter.ctrfReport.results.tests[0].status).toBe('passed')
        expect(tmpReporter.ctrfReport.results.tests[0].flaky).toBe(false)
        expect(tmpReporter.ctrfReport.results.tests[0].retries).toBe(0)

        expect(tmpReporter.ctrfReport.results.tests[1].status).toBe('passed')
        expect(tmpReporter.ctrfReport.results.tests[1].flaky).toBe(true)
        expect(tmpReporter.ctrfReport.results.tests[1].retries).toBe(1)

        expect(tmpReporter.ctrfReport.results.tests[2].status).toBe('passed')
        expect(tmpReporter.ctrfReport.results.tests[2].flaky).toBe(true)
        expect(tmpReporter.ctrfReport.results.tests[2].retries).toBe(2)

        expect(tmpReporter.ctrfReport.results).toMatchSnapshot()
      })
    })

    describe('skipped test', () => {
      const suite = Object.values(SUITES)[2]
      beforeEach(() => {
        tmpReporter = new GenerateCtrfReport()
        tmpReporter.onSuiteStart(suite as any)
      })

      test('suite with skippedTest', () => {
        tmpReporter.onTestEnd(suite.tests[0] as any)
        tmpReporter.onTestEnd(suite.tests[1] as any)

        expect(tmpReporter.ctrfReport.results.summary.passed).toBe(1)
        expect(tmpReporter.ctrfReport.results.summary.failed).toBe(0)
        expect(tmpReporter.ctrfReport.results.summary.skipped).toBe(1)

        tmpReporter.onRunnerEnd(getRunnerForSuite(suite))
        expect(tmpReporter.ctrfReport.results).toMatchSnapshot()
      })
    })

    describe('passed spec', () => {
      const suite = Object.values(SUITES)[3]
      beforeEach(() => {
        tmpReporter = new GenerateCtrfReport()
        tmpReporter.onSuiteStart(suite as any)
      })

      test('passed suite with retry', () => {
        tmpReporter.onSuiteStart(suite as any)
        tmpReporter.onTestEnd(suite.tests[0] as any)
        tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

        expect(tmpReporter.ctrfReport.results.tests[0].status).toBe('passed')
        expect(tmpReporter.ctrfReport.results.tests[0].flaky).toBe(true)
        expect(tmpReporter.ctrfReport.results.tests[0].retries).toBe(1)
        expect(tmpReporter.ctrfReport.results).toMatchSnapshot()
      })
    })
  })

  describe('reporter params', () => {
    test('all params + custom dir + capabilities', () => {
      const suite = { ...Object.values(SUITES)[0] }
      suite.file = 'fullParams.test.ts'
      const input = {
        appName: 'testApp',
        appVersion: '1.0.0',
        buildUrl: 'http://example.com',
        buildNumber: '100',
        buildName: 'test build',
        osPlatform: 'darwin',
        osVersion: '10.15.7',
        osRelease: 'latest',
      }
      const outputDir = 'ctrfCustom'
      const runner = getRunnerForSuite(suite)
      tmpReporter = new GenerateCtrfReport({
        ...input,
        outputDir,
      })
      tmpReporter.onRunnerStart(runner)
      tmpReporter.onSuiteStart(suite as any)
      tmpReporter.onTestEnd(suite.tests[0] as any)
      tmpReporter.onTestEnd(suite.tests[1] as any)
      tmpReporter.onRunnerEnd(runner)

      expect(tmpReporter.ctrfReport.results.environment).toMatchObject({
        ...input,
        extra: { browserName: runner.capabilities.browserName },
      })
      expect(fs.existsSync(outputDir)).toBe(true)
      fs.rmSync(outputDir, { recursive: true, force: true })
    })

    test('minimal', () => {
      const suite = { ...Object.values(SUITES)[1] }
      suite.file = 'minParams.test.ts'

      tmpReporter = new GenerateCtrfReport({ minimal: true })
      tmpReporter.onRunnerStart(getRunnerForSuite(suite))
      tmpReporter.onSuiteStart(suite as any)
      tmpReporter.onTestEnd(suite.tests[0] as any)
      tmpReporter.onTestEnd(suite.tests[1] as any)
      tmpReporter.onSuiteEnd(suite as any)
      tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

      expect(tmpReporter.ctrfReport.results.tests).toMatchSnapshot()
    })
  })
})
