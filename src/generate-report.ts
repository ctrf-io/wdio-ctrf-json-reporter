/* eslint-disable no-control-regex */
import WDIOReporter, {
  type SuiteStats,
  type RunnerStats,
  type TestStats,
} from '@wdio/reporter'
import {
  type CtrfTest,
  type CtrfEnvironment,
  type CtrfReport,
  type CtrfTestState,
} from '../types/ctrf'
import fs = require('fs')
import path = require('path')

interface ReporterConfigOptions {
  outputFile?: string
  outputDir?: string
  minimal?: boolean
  screenshot?: boolean
  testType?: string
  appName?: string | undefined
  appVersion?: string | undefined
  osPlatform?: string | undefined
  osRelease?: string | undefined
  osVersion?: string | undefined
  buildName?: string | undefined
  buildNumber?: string | undefined
  buildUrl?: string | undefined
  debug?: boolean
}

class GenerateCtrfReport extends WDIOReporter {
  private readonly ctrfReport: CtrfReport
  readonly ctrfEnvironment: CtrfEnvironment
  private readonly reporterConfigOptions: ReporterConfigOptions

  private readonly reporterName = 'wdio-ctrf-json-reporter'
  private readonly defaultOutputFile = 'ctrf-report.json'
  private readonly defaultOutputDir = 'ctrf'
  private currentSuite = ''
  private currentSpecFile = ''
  private currentBrowser = ''

  constructor(reporterOptions: ReporterConfigOptions) {
    super(reporterOptions)

    this.reporterConfigOptions = {
      outputFile: reporterOptions?.outputFile ?? this.defaultOutputFile,
      outputDir: reporterOptions?.outputDir ?? this.defaultOutputDir,
      minimal: reporterOptions?.minimal ?? false,
      appName: reporterOptions?.appName ?? undefined,
      testType: reporterOptions?.testType ?? 'e2e',
      appVersion: reporterOptions?.appVersion ?? undefined,
      osPlatform: reporterOptions?.osPlatform ?? undefined,
      osRelease: reporterOptions?.osRelease ?? undefined,
      osVersion: reporterOptions?.osVersion ?? undefined,
      buildName: reporterOptions?.buildName ?? undefined,
      buildNumber: reporterOptions?.buildNumber ?? undefined,
      buildUrl: reporterOptions?.buildUrl ?? undefined,
      debug: reporterOptions?.debug ?? false,
    }
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

    this.ctrfEnvironment = {}

    if (this.reporterConfigOptions?.outputFile !== undefined)
      this.setFilename(this.reporterConfigOptions.outputFile)

    if (
      !fs.existsSync(
        this.reporterConfigOptions.outputDir ?? this.defaultOutputDir
      )
    ) {
      fs.mkdirSync(
        this.reporterConfigOptions.outputDir ?? this.defaultOutputDir,
        { recursive: true }
      )
    }
  }

  private previousReport?: CtrfReport

  onSuiteStart(suite: SuiteStats): void {
    this.currentSuite = suite.fullTitle
    this.currentSpecFile = suite.file
    const reportFile = path.join(
      this.reporterConfigOptions.outputDir ?? this.defaultOutputDir,
      this.getReportFileName(this.currentSpecFile)
    )
    if (fs.existsSync(reportFile)) {
      try {
        this.previousReport = JSON.parse(
          fs.readFileSync(reportFile, 'utf8')
        ) as CtrfReport
        if (this.reporterConfigOptions.debug === true) {
          console.debug(`${this.reporterName}: read previous report`)
        }
      } catch (e) {
        if (this.reporterConfigOptions.debug === true) {
          console.debug(
            `${this.reporterName}: Error reading previous report ${String(e)}`
          )
        }
      }
    }
  }

  onRunnerStart(runner: RunnerStats): void {
    this.ctrfReport.results.summary.start = Date.now()
    const caps: WebdriverIO.Capabilities = runner.capabilities as any
    if (caps.browserName !== undefined) {
      this.currentBrowser = caps.browserName
    }
    if (caps.browserVersion !== undefined) {
      this.currentBrowser += ` ${caps.browserVersion}`
    }
    this.setEnvironmentDetails(this.reporterConfigOptions ?? {})
    this.ctrfEnvironment.extra = caps
    if (this.hasEnvironmentDetails(this.ctrfEnvironment)) {
      this.ctrfReport.results.environment = this.ctrfEnvironment
    }
  }

  onTestEnd(testStats: TestStats): void {
    this.updateCtrfTestResultsFromTestStats(testStats, testStats.state)
    this.updateCtrfTotalsFromTestStats(testStats)
  }

  private getReportFileName(specFilePath: string): string {
    // Find relative path of spec file
    let specRelativePath = specFilePath
    if (specFilePath.startsWith(process.cwd())) {
      specRelativePath = specFilePath.split(process.cwd())[1]
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
      .replace(/[\x00-\x1F]/g, '_')
      .trim()
      .replace(/[. ]+$/, '')
    return `ctrf-report-${uniqueIdentifier}.json`
  }

  onRunnerEnd(runner: RunnerStats): void {
    this.reporterConfigOptions.outputFile = this.getReportFileName(
      runner.specs[0]
    )
    this.writeReportToFile(this.ctrfReport)
  }

  private setFilename(filename: string): void {
    if (filename.endsWith('.json')) {
      this.reporterConfigOptions.outputFile = filename
    } else {
      this.reporterConfigOptions.outputFile = `${filename}.json`
    }
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
      ctrfTest.stop =
        test.end !== undefined ? Math.floor(test.end.getTime() / 1000) : 0
      ctrfTest.message = this.extractFailureDetails(test).message
      ctrfTest.trace = this.extractFailureDetails(test).trace
      ctrfTest.rawStatus = test.state
      ctrfTest.type = this.reporterConfigOptions.testType ?? 'e2e'
      ctrfTest.retries =
        previousTest?.status === 'failed'
          ? (previousTest.retries ?? 0) + 1
          : test.retries ?? 0
      ctrfTest.flaky =
        previousTest?.status === 'failed'
          ? true
          : test.state === 'passed' && (ctrfTest.retries ?? 0) > 0
      ctrfTest.suite = this.currentSuite
      ctrfTest.filePath = this.currentSpecFile
      ctrfTest.browser = this.currentBrowser
    }

    this.ctrfReport.results.tests.push(ctrfTest)
  }

  setEnvironmentDetails(reporterConfigOptions: ReporterConfigOptions): void {
    if (reporterConfigOptions.appName !== undefined) {
      this.ctrfEnvironment.appName = reporterConfigOptions.appName
    }
    if (reporterConfigOptions.appVersion !== undefined) {
      this.ctrfEnvironment.appVersion = reporterConfigOptions.appVersion
    }
    if (reporterConfigOptions.osPlatform !== undefined) {
      this.ctrfEnvironment.osPlatform = reporterConfigOptions.osPlatform
    }
    if (reporterConfigOptions.osRelease !== undefined) {
      this.ctrfEnvironment.osRelease = reporterConfigOptions.osRelease
    }
    if (reporterConfigOptions.osVersion !== undefined) {
      this.ctrfEnvironment.osVersion = reporterConfigOptions.osVersion
    }
    if (reporterConfigOptions.buildName !== undefined) {
      this.ctrfEnvironment.buildName = reporterConfigOptions.buildName
    }
    if (reporterConfigOptions.buildNumber !== undefined) {
      this.ctrfEnvironment.buildNumber = reporterConfigOptions.buildNumber
    }
    if (reporterConfigOptions.buildUrl !== undefined) {
      this.ctrfEnvironment.buildUrl = reporterConfigOptions.buildUrl
    }
  }

  hasEnvironmentDetails(environment: CtrfEnvironment): boolean {
    return Object.keys(environment).length > 0
  }

  extractFailureDetails(testResult: TestStats): Partial<CtrfTest> {
    if (testResult.state === 'failed' && testResult.error !== undefined) {
      const failureDetails: Partial<CtrfTest> = {}
      if (testResult.error.message !== undefined) {
        failureDetails.message = testResult.error.message
      }
      if (testResult.error.stack !== undefined) {
        failureDetails.trace = testResult.error.stack
      }
      return failureDetails
    }
    return {}
  }

  private writeReportToFile(data: CtrfReport): void {
    const filePath = path.join(
      this.reporterConfigOptions.outputDir ?? this.defaultOutputDir,
      this.reporterConfigOptions.outputFile ?? this.defaultOutputFile
    )
    const str = JSON.stringify(data, null, 2)
    try {
      fs.writeFileSync(filePath, str + '\n')
      if (this.reporterConfigOptions.debug === true) {
        console.debug(`${this.reporterName}: successfully written ${filePath}`)
      }
    } catch (e) {
      if (this.reporterConfigOptions.debug === true) {
        console.debug(`${this.reporterName}: error writing report ${String(e)}`)
      }
    }
  }
}

export default GenerateCtrfReport
