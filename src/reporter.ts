import WDIOReporter, {
  type SuiteStats,
  type RunnerStats,
  type TestStats,
  type HookStats,
} from '@wdio/reporter'
import { type Reporters } from '@wdio/types'
import {
  type CtrfTest,
  type CtrfEnvironment,
  type CtrfReport,
} from './types/ctrf.js'
import { existsSync, mkdirSync } from 'fs'

export interface CtrfReporterConfigOptions extends Partial<Reporters.Options> {
  minimal?: boolean
  testType?: string
  appName?: string
  appVersion?: string
  osPlatform?: string
  osRelease?: string
  osVersion?: string
  buildName?: string
  buildNumber?: string
  buildUrl?: string
}

export default class GenerateCtrfReport extends WDIOReporter {
  readonly ctrfReport: CtrfReport
  private readonly reporterConfigOptions: CtrfReporterConfigOptions

  private readonly outputDir: string
  private currentSuite = ''
  private currentSpecFile = ''
  private currentBrowser = ''

  constructor(options: CtrfReporterConfigOptions = {}) {
    if (options?.logFile?.endsWith('.log')) {
      options.logFile = options.logFile.slice(0, -4) + '.json'
    }
    options = {
      outputDir: 'ctrf',
      minimal: false,
      testType: 'e2e',
      stdout: false,
      ...options,
    }
    super(options)
    this.outputDir = options.outputDir ?? 'ctrf'
    this.reporterConfigOptions = options
    this.ctrfReport = {
      results: {
        tool: {
          name: 'webdriverio',
        },
        summary: {
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          pending: 0,
          other: 0,
          start: 0,
          stop: 0,
        },
        tests: [],
      },
    }

    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true })
    }
  }

  onSuiteStart(suite: SuiteStats): void {
    this.currentSuite = suite.fullTitle
    this.currentSpecFile = suite.file
  }

  onRunnerStart(runner: RunnerStats): void {
    this.ctrfReport.results.summary.start = Date.now()
    const caps: WebdriverIO.Capabilities = runner.capabilities as any
    if (caps?.browserName) {
      this.currentBrowser = caps.browserName
    }
    if (caps?.browserVersion) {
      this.currentBrowser += ` ${caps.browserVersion}`
    }
    this.ctrfReport.results.environment = {
      appName: this.reporterConfigOptions.appName,
      appVersion: this.reporterConfigOptions.appVersion,
      osPlatform: this.reporterConfigOptions.osPlatform,
      osRelease: this.reporterConfigOptions.osRelease,
      osVersion: this.reporterConfigOptions.osVersion,
      buildName: this.reporterConfigOptions.buildName,
      buildNumber: this.reporterConfigOptions.buildNumber,
      buildUrl: this.reporterConfigOptions.buildUrl,
      extra: caps,
    }
  }

  onHookEnd(stats: HookStats): void {
    if (stats.error) {
      this.handleTestOrHookEnd(stats, stats.state)
    }
  }

  onTestEnd(stats: TestStats | HookStats): void {
    this.handleTestOrHookEnd(stats, stats.state)
  }

  onRunnerEnd(): void {
    this.ctrfReport.results.summary.stop = Date.now()
    this.write(JSON.stringify(this.ctrfReport, null, 2))
  }

  private handleTestOrHookEnd(
    stats: TestStats | HookStats,
    status: TestStats['state'] | HookStats['state']
  ): void {
    this.updateCtrfTestResultsFromTestStats(stats, status)
    this.updateCtrfTotalsFromTestStats(stats)
  }

  private updateCtrfTotalsFromTestStats(stats: TestStats | HookStats): void {
    this.ctrfReport.results.summary.tests += 1

    switch (stats.state) {
      case 'passed':
        this.ctrfReport.results.summary.passed += 1
        break
      case 'failed':
        this.ctrfReport.results.summary.failed += 1
        break
      case 'skipped':
        this.ctrfReport.results.summary.skipped += 1
        break
      case 'pending':
        this.ctrfReport.results.summary.pending += 1
        break
      default:
        this.ctrfReport.results.summary.other += 1
        break
    }
  }

  private updateCtrfTestResultsFromTestStats(
    stats: TestStats | HookStats,
    status: TestStats['state'] | HookStats['state']
  ): void {
    const ctrfTest: CtrfTest = {
      name: stats.title,
      status: status ?? 'other',
      duration: stats._duration,
    }

    if (this.reporterConfigOptions.minimal === false) {
      ctrfTest.start = Math.floor(stats.start.getTime() / 1000)
      ctrfTest.stop = stats.end ? Math.floor(stats.end.getTime() / 1000) : 0
      ctrfTest.message = this.extractFailureDetails(stats).message
      ctrfTest.trace = this.extractFailureDetails(stats).trace
      ctrfTest.rawStatus = stats.state
      ctrfTest.type = this.reporterConfigOptions.testType ?? 'e2e'
      if (stats.type === 'test') {
        const testStats = stats as TestStats
        ctrfTest.retries = testStats.retries ?? 0
        ctrfTest.flaky =
          testStats.state === 'passed' && (testStats.retries ?? 0) > 0
      }
      ctrfTest.suite = this.currentSuite
      ctrfTest.filePath = this.currentSpecFile
      ctrfTest.browser = this.currentBrowser
    }

    this.ctrfReport.results.tests.push(ctrfTest)
  }

  hasEnvironmentDetails(environment: CtrfEnvironment): boolean {
    return Object.keys(environment).length > 0
  }

  extractFailureDetails(testResult: TestStats | HookStats): Partial<CtrfTest> {
    if (testResult.state === 'failed' && testResult.error) {
      const failureDetails: Partial<CtrfTest> = {}
      if (testResult.error.message) {
        failureDetails.message = testResult.error.message
      }
      if (testResult.error.stack) {
        failureDetails.trace = testResult.error.stack
      }
      return failureDetails
    }
    return {}
  }
}
