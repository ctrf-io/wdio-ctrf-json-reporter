import WDIOReporter, {
  type SuiteStats,
  type RunnerStats,
  type TestStats,
  type HookStats,
} from '@wdio/reporter'
import { type Reporters } from '@wdio/types'
import {
  type CTRFReport,
  type Test as CtrfTestBase,
  type TestStatus,
  type Environment,
  type Results,
} from 'ctrf'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as crypto from 'crypto'

// Local overrides to keep backward-compatible string suite (canonical is string[])
// TODO(v1): align suite to string[] and remove this override
type WdioTest = Omit<CtrfTestBase, 'suite'> & { suite?: string | string[] }
// TODO(v1): align buildNumber to number and remove this override
type WdioEnvironment = Omit<Environment, 'buildNumber'> & {
  buildNumber?: string | number
}
type WdioResults = Omit<Results, 'tests' | 'environment'> & {
  tests: WdioTest[]
  environment?: WdioEnvironment
}
type WdioCTRFReport = Omit<CTRFReport, 'results'> & { results: WdioResults }

/**
 * Global key for the runtime function.
 * Test code uses this to send metadata to the reporter.
 */
export const CTRF_RUNTIME_KEY = '__ctrfTestRuntime'

/**
 * Runtime message for extra data
 */
export interface CtrfRuntimeMessage {
  type: 'extra'
  data: Record<string, unknown>
}

/**
 * Type for the runtime handler function
 */
export type CtrfRuntimeHandler = (message: CtrfRuntimeMessage) => void

/**
 * Internal metadata storage for tests (keyed by test title)
 */
interface TestMetadata {
  extra: Record<string, unknown>
}

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
  readonly ctrfReport: WdioCTRFReport
  private readonly reporterConfigOptions: CtrfReporterConfigOptions

  private readonly outputDir: string
  private currentSuite = ''
  private currentSpecFile = ''
  private currentBrowser = ''

  /**
   * Runtime metadata collection
   */
  private currentTestTitle: string | undefined
  private testMetadata: Map<string, TestMetadata> = new Map()

  constructor(options: CtrfReporterConfigOptions = {}) {
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
      reportFormat: 'CTRF',
      specVersion: '0.0.0',
      reportId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      generatedBy: 'wdio-ctrf-json-reporter',
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

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }

    // Register the runtime handler so test code can call ctrf.extra()
    this.registerRuntimeHandler()
  }

  /**
   * Register the global runtime handler for test code to send metadata
   */
  private registerRuntimeHandler(): void {
    const handler: CtrfRuntimeHandler = (message) => {
      this.handleRuntimeMessage(message)
    }

    // Set on global (WDIO runs in Node)
    const g = typeof globalThis !== 'undefined' ? globalThis : (global as any)
    g[CTRF_RUNTIME_KEY] = handler
  }

  /**
   * Clear the global runtime handler
   */
  private clearRuntimeHandler(): void {
    const g = typeof globalThis !== 'undefined' ? globalThis : (global as any)
    delete g[CTRF_RUNTIME_KEY]
  }

  /**
   * Handle runtime messages from test code
   */
  private handleRuntimeMessage(message: CtrfRuntimeMessage): void {
    if (!this.currentTestTitle) {
      // Outside test context - silently ignore
      return
    }

    let metadata = this.testMetadata.get(this.currentTestTitle)
    if (!metadata) {
      metadata = { extra: {} }
      this.testMetadata.set(this.currentTestTitle, metadata)
    }

    if (message.type === 'extra') {
      // Deep merge extra data
      metadata.extra = this.deepMerge(
        metadata.extra as Record<string, unknown>,
        message.data as Record<string, unknown>
      )
    }
  }

  /**
   * Deep merge two objects following CTRF merge rules:
   * - Arrays: concatenated
   * - Objects: recursively merged
   * - Primitives: overwritten
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...target }

    for (const [key, sourceValue] of Object.entries(source)) {
      const targetValue = result[key]

      if (Array.isArray(sourceValue)) {
        result[key] = Array.isArray(targetValue)
          ? [...targetValue, ...sourceValue]
          : [...sourceValue]
      } else if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue)
      ) {
        result[key] =
          targetValue !== null &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
            ? this.deepMerge(
                targetValue as Record<string, unknown>,
                sourceValue as Record<string, unknown>
              )
            : { ...sourceValue }
      } else {
        result[key] = sourceValue
      }
    }

    return result
  }

  private previousReport?: WdioCTRFReport

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
      extra: caps as Record<string, unknown>,
    }

    const oldCtfFilePath = path.join(
      this.outputDir,
      this.getReportFileName(runner.specs[0])
    )
    if (fs.existsSync(oldCtfFilePath)) {
      try {
        this.previousReport = JSON.parse(
          fs.readFileSync(oldCtfFilePath, 'utf8')
        ) as WdioCTRFReport
      } catch (e) {
        console.error(`CTRF: Error reading previous report ${String(e)}`)
      }
    }
  }

  onHookEnd(stats: HookStats): void {
    if (stats.error) {
      this.updateCtrfTestResultsFromHookStats(stats)
      this.updateCtrfTotalsFromTestStats(stats)
    }
  }

  onTestStart(test: TestStats): void {
    // Track current test for runtime metadata collection
    this.currentTestTitle = test.title

    // Initialize metadata storage for this test
    if (!this.testMetadata.has(test.title)) {
      this.testMetadata.set(test.title, { extra: {} })
    }
  }

  onTestEnd(testStats: TestStats): void {
    this.updateCtrfTestResultsFromTestStats(testStats, testStats.state)
    this.updateCtrfTotalsFromTestStats(testStats)

    // Clear current test context
    this.currentTestTitle = undefined
  }

  private getReportFileName(specFilePath: string): string {
    if (specFilePath.startsWith('file://')) {
      specFilePath = fileURLToPath(specFilePath)
    }
    // Find relative path of spec file
    let specRelativePath = specFilePath
    if (specFilePath.includes(process.cwd())) {
      specRelativePath = path.relative(process.cwd(), specFilePath)
    }
    // Replace path separator with hyphen and remove file extension
    const uniqueIdentifier = specRelativePath
      .split(path.sep)
      .join('-')
      // Remove file extension
      .replace(/\.(js|ts)$/, '')
      // Invalid for Windows
      .replace(/[<>:"|?*]/g, '_')
      // Control characters (invalid for both Windows and Linux)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F]/g, '_')
      .trim()
      .replace(/[. ]+$/, '')
    return `ctrf-${uniqueIdentifier}.json`
  }

  onRunnerEnd(runner: RunnerStats): void {
    this.ctrfReport.results.summary.stop = Date.now()
    const fileName = this.getReportFileName(runner.specs[0])
    this.writeReportToFile(this.ctrfReport, fileName)

    // Clear the global runtime handler
    this.clearRuntimeHandler()
  }

  private updateCtrfTotalsFromTestStats(
    testStats: TestStats | HookStats
  ): void {
    this.ctrfReport.results.summary.tests += 1

    switch (testStats.state) {
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
    test: TestStats,
    status: TestStatus
  ): void {
    const ctrfTest: WdioTest = {
      name: test.title,
      status,
      duration: test._duration,
    }

    if (this.reporterConfigOptions.minimal === false) {
      const previousTest = this.previousReport?.results.tests.find(
        (name) => name.name === test.title
      )
      ctrfTest.start = Math.floor(test.start.getTime() / 1000)
      ctrfTest.stop = test.end ? Math.floor(test.end.getTime() / 1000) : 0
      ctrfTest.message = this.extractFailureDetails(test).message
      ctrfTest.trace = this.extractFailureDetails(test).trace
      ctrfTest.rawStatus = test.state
      ctrfTest.type = this.reporterConfigOptions.testType ?? 'e2e'

      if (previousTest) {
        if (previousTest.status === 'failed') {
          ctrfTest.retries = (previousTest.retries ?? 0) + 1
        }
      } else {
        ctrfTest.retries = test.retries ?? 0
      }

      if (previousTest) {
        if (previousTest.status === 'failed') {
          ctrfTest.flaky = test.state === 'passed'
        } else {
          ctrfTest.flaky = false
        }
      } else {
        ctrfTest.flaky = test.state === 'passed' && (test.retries ?? 0) > 0
      }
      ctrfTest.suite = this.currentSuite
      ctrfTest.filePath = this.currentSpecFile
      ctrfTest.browser = this.currentBrowser
    }

    // Add runtime metadata (extra) if present
    const metadata = this.testMetadata.get(test.title)
    if (metadata && Object.keys(metadata.extra).length > 0) {
      ctrfTest.extra = metadata.extra as Record<string, any>
    }

    this.ctrfReport.results.tests.push(ctrfTest)
  }

  private updateCtrfTestResultsFromHookStats(stats: HookStats): void {
    const ctrfTest: WdioTest = {
      name: stats.title,
      status: stats.state ?? 'other',
      duration: stats._duration,
    }

    if (this.reporterConfigOptions.minimal === false) {
      ctrfTest.start = Math.floor(stats.start.getTime() / 1000)
      ctrfTest.stop = stats.end ? Math.floor(stats.end.getTime() / 1000) : 0
      ctrfTest.message = this.extractFailureDetails(stats).message
      ctrfTest.trace = this.extractFailureDetails(stats).trace
      ctrfTest.rawStatus = stats.state
      ctrfTest.suite = this.currentSuite
      ctrfTest.filePath = this.currentSpecFile
      ctrfTest.browser = this.currentBrowser
    }

    this.ctrfReport.results.tests.push(ctrfTest)
  }

  hasEnvironmentDetails(environment: WdioEnvironment): boolean {
    return Object.keys(environment).length > 0
  }

  extractFailureDetails(testResult: TestStats | HookStats): Partial<WdioTest> {
    if (testResult.state === 'failed' && testResult.error) {
      const failureDetails: Partial<WdioTest> = {}
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

  private getReportPath(fileName: string): string {
    return path.join(this.outputDir, fileName)
  }

  private writeReportToFile(data: WdioCTRFReport, fileName: string): void {
    const filePath = this.getReportPath(fileName)
    const str = JSON.stringify(data, null, 2)
    try {
      fs.writeFileSync(filePath, str + '\n')
    } catch (e) {
      console.error(`CTRF: Error writing report ${String(e)}`)
    }
  }
}
