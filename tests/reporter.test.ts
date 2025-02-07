import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
import { getRunnerForSuite, SUITES } from './testdata'
import GenerateCtrfReport from '../src'
import * as fs from 'fs'
import { type CtrfReporterConfigOptions } from '../src/reporter'

const mockOptions: CtrfReporterConfigOptions = {
  logFile: 'ctrf-report.log', // only used in vitest
}
let tmpReporter: GenerateCtrfReport

beforeAll(() => {
  fs.rmSync('ctrf', { recursive: true, force: true })
})

describe('Reporter output', () => {
  test('! Passed tests in suite', async () => {
    const suite = Object.values(SUITES)[0]
    tmpReporter = new GenerateCtrfReport(mockOptions)
    tmpReporter.onRunnerStart(getRunnerForSuite(suite))
    tmpReporter.onSuiteStart(suite as any)
    tmpReporter.onTestStart(suite.tests[0] as any)
    tmpReporter.onTestStart(suite.tests[1] as any)
    tmpReporter.onTestEnd(suite.tests[0] as any)
    tmpReporter.onTestEnd(suite.tests[1] as any)
    tmpReporter.onSuiteEnd(suite as any)
    tmpReporter.onRunnerEnd(getRunnerForSuite(suite))
    expect(tmpReporter.ctrfReport.results).toMatchObject({
      summary: {
        failed: 0,
        other: 0,
        passed: 2,
        pending: 0,
        skipped: 0,
        start: expect.any(Number),
        stop: expect.any(Number),
        tests: 2,
      },
      tests: [
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: undefined,
          name: suite.tests[0].title,
          rawStatus: 'passed',
          retries: 0,
          start: expect.any(Number),
          status: 'passed',
          stop: 0,
          suite: suite.fullTitle,
          trace: undefined,
          type: 'e2e',
        },
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: undefined,
          name: suite.tests[1].title,
          rawStatus: 'passed',
          retries: 0,
          start: expect.any(Number),
          status: 'passed',
          stop: 0,
          suite: suite.fullTitle,
          trace: undefined,
          type: 'e2e',
        },
      ],
      tool: {
        name: 'webdriverio',
      },
    })
  })

  test('! Skipped test in suite', () => {
    const suite = SUITES.suite_1passed_1skipped
    tmpReporter = new GenerateCtrfReport(mockOptions)
    tmpReporter.onTestStart(suite as any)
    tmpReporter.onRunnerStart(getRunnerForSuite(suite))
    tmpReporter.onSuiteStart(suite as any)
    tmpReporter.onTestStart(suite.tests[0] as any)
    tmpReporter.onTestStart(suite.tests[1] as any)
    tmpReporter.onTestEnd(suite.tests[0] as any)
    tmpReporter.onTestEnd(suite.tests[1] as any)
    tmpReporter.onSuiteEnd(suite as any)
    tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

    expect(tmpReporter.ctrfReport.results).toMatchObject({
      summary: {
        failed: 0,
        other: 0,
        passed: 1,
        pending: 0,
        skipped: 1,
        start: expect.any(Number),
        stop: expect.any(Number),
        tests: 2,
      },
      tests: [
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: undefined,
          name: suite.tests[0].title,
          rawStatus: 'passed',
          retries: 0,
          start: 1753042662,
          status: 'passed',
          stop: 0,
          suite: suite.fullTitle,
          trace: undefined,
          type: 'e2e',
        },
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: undefined,
          name: suite.tests[1].title,
          rawStatus: 'skipped',
          retries: 0,
          start: 1753042662,
          status: 'skipped',
          stop: 0,
          suite: suite.fullTitle,
          trace: undefined,
          type: 'e2e',
        },
      ],
      tool: {
        name: 'webdriverio',
      },
    })
  })

  test('! Failed test in suite', () => {
    const suite = SUITES.suite_1passed_1failed
    tmpReporter = new GenerateCtrfReport(mockOptions)
    tmpReporter.onTestStart(suite as any)
    tmpReporter.onRunnerStart(getRunnerForSuite(suite))
    tmpReporter.onSuiteStart(suite as any)
    tmpReporter.onTestStart(suite.tests[0] as any)
    tmpReporter.onTestStart(suite.tests[1] as any)
    tmpReporter.onTestEnd(suite.tests[0] as any)
    tmpReporter.onTestEnd(suite.tests[1] as any)
    tmpReporter.onSuiteEnd(suite as any)
    tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

    expect(tmpReporter.ctrfReport.results).toMatchObject({
      summary: {
        failed: 1,
        other: 0,
        passed: 1,
        pending: 0,
        skipped: 0,
        start: expect.any(Number),
        stop: expect.any(Number),
        tests: 2,
      },
      tests: [
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: undefined,
          name: suite.tests[0].title,
          rawStatus: 'passed',
          retries: 0,
          start: 1753042662,
          status: 'passed',
          stop: 0,
          suite: suite.fullTitle,
          trace: undefined,
          type: 'e2e',
        },
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: suite.tests[1].error?.message,
          name: suite.tests[1].title,
          rawStatus: 'failed',
          retries: 0,
          start: 1753042662,
          status: 'failed',
          stop: 0,
          suite: suite.fullTitle,
          trace: suite.tests[1].error?.stack,
          type: 'e2e',
        },
      ],
      tool: {
        name: 'webdriverio',
      },
    })
  })

  test('! Failed test with retries in suite', () => {
    const suite = SUITES.suite_1failed_withRetries
    tmpReporter = new GenerateCtrfReport(mockOptions)
    tmpReporter.onTestStart(suite as any)
    tmpReporter.onRunnerStart(getRunnerForSuite(suite))
    tmpReporter.onSuiteStart(suite as any)
    tmpReporter.onTestStart(suite.tests[0] as any)
    tmpReporter.onTestEnd(suite.tests[0] as any)
    tmpReporter.onSuiteEnd(suite as any)
    tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

    expect(tmpReporter.ctrfReport.results).toMatchObject({
      summary: {
        failed: 1,
        other: 0,
        passed: 0,
        pending: 0,
        skipped: 0,
        start: expect.any(Number),
        stop: expect.any(Number),
        tests: 1,
      },
      tests: [
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: suite.tests[0].error?.message,
          name: suite.tests[0].title,
          rawStatus: 'failed',
          retries: suite.tests[0].retries,
          start: 1753042662,
          status: 'failed',
          stop: 0,
          suite: suite.fullTitle,
          trace: suite.tests[0].error?.stack,
          type: 'e2e',
        },
      ],
      tool: {
        name: 'webdriverio',
      },
    })
  })

  test('! Passed test with retries in suite', () => {
    const suite = SUITES.suite_1passed_withRetries
    tmpReporter = new GenerateCtrfReport(mockOptions)
    tmpReporter.onTestStart(suite as any)
    tmpReporter.onRunnerStart(getRunnerForSuite(suite))
    tmpReporter.onSuiteStart(suite as any)
    tmpReporter.onTestStart(suite.tests[0] as any)
    tmpReporter.onTestEnd(suite.tests[0] as any)
    tmpReporter.onSuiteEnd(suite as any)
    tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

    expect(tmpReporter.ctrfReport.results).toMatchObject({
      summary: {
        failed: 0,
        other: 0,
        passed: 1,
        pending: 0,
        skipped: 0,
        start: expect.any(Number),
        stop: expect.any(Number),
        tests: 1,
      },
      tests: [
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: true,
          message: undefined,
          name: suite.tests[0].title,
          rawStatus: 'passed',
          retries: suite.tests[0].retries,
          start: 1753042662,
          status: 'passed',
          stop: 0,
          suite: suite.fullTitle,
          trace: undefined,
          type: 'e2e',
        },
      ],
      tool: {
        name: 'webdriverio',
      },
    })
  })

  describe('! Spec Retry for 1 Failed test', () => {
    const suite = { ...SUITES.suite_1passed_1failed }
    suite.file = `${suite.file}.retrySpec`
    const test0 = suite.tests[0]
    const test1 = suite.tests[1]

    beforeEach(() => {
      tmpReporter = new GenerateCtrfReport(mockOptions)
    })

    test('first run - 1 passed, 1 failure, 0 flaky', () => {
      tmpReporter.onRunnerStart(getRunnerForSuite(suite))
      tmpReporter.onSuiteStart(suite as any)
      tmpReporter.onTestStart(test0 as any)
      tmpReporter.onTestEnd(test0 as any)
      tmpReporter.onTestStart(test1 as any)
      tmpReporter.onTestEnd(test1 as any)
      tmpReporter.onSuiteEnd(suite as any)
      tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

      expect(tmpReporter.ctrfReport.results.summary).toMatchObject({
        failed: 1,
        other: 0,
        passed: 1,
        pending: 0,
        skipped: 0,
        start: expect.any(Number),
        stop: expect.any(Number),
        tests: 2,
      })

      expect(tmpReporter.ctrfReport.results.tests).toMatchObject([
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: undefined,
          name: suite.tests[0].title,
          rawStatus: 'passed',
          retries: 0,
          start: 1753042662,
          status: 'passed',
          stop: 0,
          suite: suite.fullTitle,
          trace: undefined,
          type: 'e2e',
        },
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: suite.tests[1].error?.message,
          name: suite.tests[1].title,
          rawStatus: 'failed',
          retries: 0,
          start: 1753042662,
          status: 'failed',
          stop: 0,
          suite: suite.fullTitle,
          trace: suite.tests[1].error?.stack,
          type: 'e2e',
        },
      ])
    })

    test('second run - 1 passed, 1 failure, 0 flaky', () => {
      tmpReporter.onRunnerStart(getRunnerForSuite(suite))
      tmpReporter.onSuiteStart(suite as any)
      tmpReporter.onTestStart(test0 as any)
      tmpReporter.onTestEnd(test0 as any)
      tmpReporter.onTestStart(test1 as any)
      tmpReporter.onTestEnd(test1 as any)
      tmpReporter.onSuiteEnd(suite as any)
      tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

      expect(tmpReporter.ctrfReport.results.summary).toMatchObject({
        failed: 1,
        other: 0,
        passed: 1,
        pending: 0,
        skipped: 0,
        start: expect.any(Number),
        stop: expect.any(Number),
        tests: 2,
      })

      expect(tmpReporter.ctrfReport.results.tests).toMatchObject([
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: undefined,
          name: suite.tests[0].title,
          rawStatus: 'passed',
          start: 1753042662,
          status: 'passed',
          stop: 0,
          suite: suite.fullTitle,
          trace: undefined,
          type: 'e2e',
        },
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: suite.tests[1].error?.message,
          name: suite.tests[1].title,
          rawStatus: 'failed',
          retries: 1,
          start: 1753042662,
          status: 'failed',
          stop: 0,
          suite: suite.fullTitle,
          trace: suite.tests[1].error?.stack,
          type: 'e2e',
        },
      ])
    })

    test('third run - 2 passed, 0 failures, 1 flaky', () => {
      const test1fixed = { ...test1 }
      test1fixed.error = undefined
      test1fixed.state = 'passed'

      tmpReporter.onRunnerStart(getRunnerForSuite(suite))
      tmpReporter.onSuiteStart(suite as any)
      tmpReporter.onTestStart(test0 as any)
      tmpReporter.onTestEnd(test0 as any)
      tmpReporter.onTestStart(test1fixed as any)
      tmpReporter.onTestEnd(test1fixed as any)
      tmpReporter.onSuiteEnd(suite as any)
      tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

      expect(tmpReporter.ctrfReport.results.summary).toMatchObject({
        failed: 0,
        other: 0,
        passed: 2,
        pending: 0,
        skipped: 0,
        start: expect.any(Number),
        stop: expect.any(Number),
        tests: 2,
      })

      expect(tmpReporter.ctrfReport.results.tests).toMatchObject([
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: false,
          message: undefined,
          name: suite.tests[0].title,
          rawStatus: 'passed',
          start: 1753042662,
          status: 'passed',
          stop: 0,
          suite: suite.fullTitle,
          trace: undefined,
          type: 'e2e',
        },
        {
          browser: 'chrome',
          duration: undefined,
          filePath: suite.file,
          flaky: true,
          message: undefined,
          name: suite.tests[1].title,
          rawStatus: 'passed',
          retries: 2,
          start: 1753042662,
          status: 'passed',
          stop: 0,
          suite: suite.fullTitle,
          trace: undefined,
          type: 'e2e',
        },
      ])
    })
  })
})

describe('Reporter params', () => {
  test('all params + capabilities', () => {
    const suite = SUITES.suite_2passed
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
    const runner = getRunnerForSuite(suite)
    const outputDir = 'ctrfCustom'
    const tmpReporter = new GenerateCtrfReport({
      ...input,
      ...mockOptions,
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
    const suite = SUITES.suite_2passed
    suite.file = 'minParams.test.ts'

    tmpReporter = new GenerateCtrfReport({ ...mockOptions, minimal: true })
    tmpReporter.onRunnerStart(getRunnerForSuite(suite))
    tmpReporter.onSuiteStart(suite as any)
    tmpReporter.onTestStart(suite.tests[0] as any)
    tmpReporter.onTestEnd(suite.tests[0] as any)
    tmpReporter.onTestStart(suite.tests[1] as any)
    tmpReporter.onTestEnd(suite.tests[1] as any)
    tmpReporter.onSuiteEnd(suite as any)
    tmpReporter.onRunnerEnd(getRunnerForSuite(suite))

    expect(tmpReporter.ctrfReport.results.tests).toMatchObject([
      {
        duration: undefined,
        name: 's1t1 - passed',
        status: 'passed',
      },
      {
        duration: undefined,
        name: 's2t2 - passed',
        status: 'passed',
      },
    ])
  })
})
