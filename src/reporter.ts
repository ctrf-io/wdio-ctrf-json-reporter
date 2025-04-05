import WDIOReporter, {
  type SuiteStats,
  type RunnerStats,
  type TestStats,
} from '@wdio/reporter'
import { type Reporters } from '@wdio/types'
import {
  type CtrfTest,
  type CtrfEnvironment,
  type CtrfReport,
  type CtrfTestState,
} from './types/ctrf'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

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

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  private previousReport?: CtrfReport

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

    const oldCtfFilePath = path.join(
      this.outputDir,
      this.getReportFileName(runner.specs[0])
    )
    if (fs.existsSync(oldCtfFilePath)) {
      try {
        this.previousReport = JSON.parse(
          fs.readFileSync(oldCtfFilePath, 'utf8')
        ) as CtrfReport
      } catch (e) {
        console.error(`CTRF: Error reading previous report ${String(e)}`)
      }
    }
  }

  onTestEnd(testStats: TestStats): void {
    this.updateCtrfTestResultsFromTestStats(testStats, testStats.state)
    this.updateCtrfTotalsFromTestStats(testStats)
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
  }

  private updateCtrfTotalsFromTestStats(testStats: TestStats): void {
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
    status: CtrfTestState
  ): void {
    const ctrfTest: CtrfTest = {
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

    this.ctrfReport.results.tests.push(ctrfTest)
  }

  hasEnvironmentDetails(environment: CtrfEnvironment): boolean {
    return Object.keys(environment).length > 0
  }

  extractFailureDetails(testResult: TestStats): Partial<CtrfTest> {
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

  private getReportPath(fileName: string): string {
    return path.join(this.outputDir, fileName)
  }

  private writeReportToFile(data: CtrfReport, fileName: string): void {
    const filePath = this.getReportPath(fileName)
    const str = JSON.stringify(data, null, 2)
    try {
      fs.writeFileSync(filePath, str + '\n')
    } catch (e) {
      console.error(`CTRF: Error writing report ${String(e)}`)
    }
  }
}
