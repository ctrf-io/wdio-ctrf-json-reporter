import {
	identityValue,
	runIdentity,
	testIdentity,
	type IdentityOptions,
} from "./identity";
import type WDIOReporterType from "@wdio/reporter";
import type { SuiteStats, RunnerStats, TestStats } from "@wdio/reporter";
import { type Reporters } from "@wdio/types";
import {
	CURRENT_SPEC_VERSION,
	type CTRFReport,
	type Test as CtrfTest,
	type TestStatus,
	type Environment,
} from "ctrf";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "node:module";
import { fileURLToPath } from "url";
import * as crypto from "crypto";

const require = createRequire(import.meta.url);
const WDIOReporter = (
	require("@wdio/reporter") as typeof import("@wdio/reporter")
).default as typeof WDIOReporterType;

/**
 * Global key for the runtime function.
 * Test code uses this to send metadata to the reporter.
 */
export const CTRF_RUNTIME_KEY = "__ctrfTestRuntime";

/**
 * Runtime message for extra data
 */
export interface CtrfRuntimeMessage {
	type: "extra";
	data: Record<string, unknown>;
}

/**
 * Type for the runtime handler function
 */
export type CtrfRuntimeHandler = (message: CtrfRuntimeMessage) => void;

/**
 * Internal metadata storage for tests (keyed by test title)
 */
interface TestMetadata {
	extra: Record<string, unknown>;
}

export interface CtrfReporterConfigOptions
	extends Partial<Reporters.Options>,
		IdentityOptions {
	minimal?: boolean;
	testType?: string;
	appName?: string;
	appVersion?: string;
	osPlatform?: string;
	osRelease?: string;
	osVersion?: string;
	buildName?: string;
	buildNumber?: number;
	buildUrl?: string;
}

export default class GenerateCtrfReport extends WDIOReporter {
	readonly ctrfReport: CTRFReport;
	private readonly reporterConfigOptions: CtrfReporterConfigOptions;

	private readonly outputDir: string;
	private currentSuite = "";
	private currentSpecFile = "";
	private currentBrowser = "";

	/**
	 * Runtime metadata collection
	 */
	private currentTestTitle: string | undefined;
	private testMetadata: Map<string, TestMetadata> = new Map();

	constructor(options: CtrfReporterConfigOptions = {}) {
		options = {
			outputDir: "ctrf",
			minimal: false,
			testType: "e2e",
			stdout: false,
			...options,
		};
		super(options);
		this.outputDir = options.outputDir ?? "ctrf";
		this.reporterConfigOptions = options;
		this.ctrfReport = {
			reportFormat: "CTRF",
			runId: runIdentity(options.runId),
			specVersion: CURRENT_SPEC_VERSION,
			reportId: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
			generatedBy: "wdio-ctrf-json-reporter",
			results: {
				tool: {
					name: "webdriverio",
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
		};

		if (!fs.existsSync(this.outputDir)) {
			fs.mkdirSync(this.outputDir, { recursive: true });
		}

		// Register the runtime handler so test code can call ctrf.extra()
		this.registerRuntimeHandler();
	}

	/**
	 * Register the global runtime handler for test code to send metadata
	 */
	private registerRuntimeHandler(): void {
		const handler: CtrfRuntimeHandler = (message) => {
			this.handleRuntimeMessage(message);
		};

		// Set on globalThis (WDIO runs in Node)
		(globalThis as Record<string, unknown>)[CTRF_RUNTIME_KEY] = handler;
	}

	/**
	 * Clear the global runtime handler
	 */
	private clearRuntimeHandler(): void {
		delete (globalThis as Record<string, unknown>)[CTRF_RUNTIME_KEY];
	}

	/**
	 * Handle runtime messages from test code
	 */
	private handleRuntimeMessage(message: CtrfRuntimeMessage): void {
		if (!this.currentTestTitle) {
			// Outside test context - silently ignore
			return;
		}

		let metadata = this.testMetadata.get(this.currentTestTitle);
		if (!metadata) {
			metadata = { extra: {} };
			this.testMetadata.set(this.currentTestTitle, metadata);
		}

		if (message.type === "extra") {
			// Deep merge extra data
			metadata.extra = this.deepMerge(
				metadata.extra as Record<string, unknown>,
				message.data as Record<string, unknown>,
			);
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
		source: Record<string, unknown>,
	): Record<string, unknown> {
		const result = { ...target };

		for (const [key, sourceValue] of Object.entries(source)) {
			const targetValue = result[key];

			if (Array.isArray(sourceValue)) {
				result[key] = Array.isArray(targetValue)
					? [...targetValue, ...sourceValue]
					: [...sourceValue];
			} else if (
				sourceValue !== null &&
				typeof sourceValue === "object" &&
				!Array.isArray(sourceValue)
			) {
				result[key] =
					targetValue !== null &&
					typeof targetValue === "object" &&
					!Array.isArray(targetValue)
						? this.deepMerge(
								targetValue as Record<string, unknown>,
								sourceValue as Record<string, unknown>,
							)
						: { ...sourceValue };
			} else {
				result[key] = sourceValue;
			}
		}

		return result;
	}

	private previousReport?: CTRFReport;
	private shardLabel?: string;
	private testVariant = "";
	private identity(test: TestStats): string {
		return testIdentity(
			"wdio",
			{
				name: test.title,
				suite: [this.currentSuite],
				filePath: this.currentSpecFile,
				variant: this.testVariant,
			},
			this.reporterConfigOptions,
		);
	}

	onSuiteStart(suite: SuiteStats): void {
		this.currentSuite = suite.fullTitle;
		this.currentSpecFile = suite.file;
	}

	onRunnerStart(runner: RunnerStats): void {
		this.ctrfReport.reportId = crypto.randomUUID();
		this.ctrfReport.timestamp = new Date().toISOString();
		this.ctrfReport.runId = runIdentity(this.reporterConfigOptions.runId);
		this.ctrfReport.results.tests = [];
		this.ctrfReport.results.summary = {
			tests: 0,
			passed: 0,
			failed: 0,
			skipped: 0,
			pending: 0,
			other: 0,
			start: 0,
			stop: 0,
		};
		this.testMetadata.clear();
		this.currentTestTitle = undefined;
		this.registerRuntimeHandler();

		this.ctrfReport.results.summary.start = Date.now();
		this.previousReport = undefined;
		this.shardLabel =
			identityValue(this.reporterConfigOptions.shardId, "shardId") ??
			runner.cid;
		const caps: WebdriverIO.Capabilities = runner.capabilities as any;
		this.testVariant = JSON.stringify([
			caps?.browserName ?? "",
			(caps as Record<string, unknown>)?.platformName ?? "",
		]);
		if (caps?.browserName) {
			this.currentBrowser = caps.browserName;
		}
		if (caps?.browserVersion) {
			this.currentBrowser += ` ${caps.browserVersion}`;
		}
		this.ctrfReport.results.environment = {
			shardId: this.shardLabel || undefined,
			appName: this.reporterConfigOptions.appName,
			appVersion: this.reporterConfigOptions.appVersion,
			osPlatform: this.reporterConfigOptions.osPlatform,
			osRelease: this.reporterConfigOptions.osRelease,
			osVersion: this.reporterConfigOptions.osVersion,
			buildName: this.reporterConfigOptions.buildName,
			buildNumber: this.reporterConfigOptions.buildNumber,
			buildUrl: this.reporterConfigOptions.buildUrl,
			extra: caps as Record<string, unknown>,
		};

		const oldCtfFilePath = path.join(
			this.outputDir,
			this.getReportFileName(runner.specs[0]),
		);
		if (fs.existsSync(oldCtfFilePath)) {
			try {
				const previousReport = JSON.parse(
					fs.readFileSync(oldCtfFilePath, "utf8"),
				) as CTRFReport;
				if (
					previousReport.runId === this.ctrfReport.runId &&
					(runner.retry ?? runner.retries ?? 0) > 0
				)
					this.previousReport = previousReport;
			} catch (e) {
				console.error(`CTRF: Error reading previous report ${String(e)}`);
			}
		}
	}

	onTestStart(test: TestStats): void {
		// Track current test for runtime metadata collection
		this.currentTestTitle = this.identity(test);

		// Initialize metadata storage for this test
		if (!this.testMetadata.has(this.identity(test))) {
			this.testMetadata.set(this.identity(test), { extra: {} });
		}
	}

	onTestEnd(testStats: TestStats): void {
		this.updateCtrfTestResultsFromTestStats(testStats, testStats.state);
		this.updateCtrfTotalsFromTestStats(testStats);

		// Clear current test context
		this.currentTestTitle = undefined;
	}

	private getReportFileName(specFilePath: string): string {
		if (specFilePath.startsWith("file://")) {
			specFilePath = fileURLToPath(specFilePath);
		}
		// Find relative path of spec file
		let specRelativePath = specFilePath;
		if (specFilePath.includes(process.cwd())) {
			specRelativePath = path.relative(process.cwd(), specFilePath);
		}
		// Replace path separator with hyphen and remove file extension
		const uniqueIdentifier = specRelativePath
			.split(path.sep)
			.join("-")
			// Remove file extension
			.replace(/\.(js|ts)$/, "")
			// Invalid for Windows
			.replace(/[<>:"|?*]/g, "_")
			// Control characters (invalid for both Windows and Linux)
			// eslint-disable-next-line no-control-regex
			.replace(/[\x00-\x1F]/g, "_")
			.trim()
			.replace(/[. ]+$/, "");
		return `ctrf-${uniqueIdentifier}${this.shardLabel ? `-${encodeURIComponent(this.shardLabel)}` : ""}.json`;
	}

	onRunnerEnd(runner: RunnerStats): void {
		this.ctrfReport.results.summary.stop = Date.now();
		const fileName = this.getReportFileName(runner.specs[0]);
		this.writeReportToFile(this.ctrfReport, fileName);

		// Clear the global runtime handler
		this.clearRuntimeHandler();
	}

	private updateCtrfTotalsFromTestStats(testStats: TestStats): void {
		this.ctrfReport.results.summary.tests += 1;

		switch (testStats.state) {
			case "passed":
				this.ctrfReport.results.summary.passed += 1;
				break;
			case "failed":
				this.ctrfReport.results.summary.failed += 1;
				break;
			case "skipped":
				this.ctrfReport.results.summary.skipped += 1;
				break;
			case "pending":
				this.ctrfReport.results.summary.pending += 1;
				break;
			default:
				this.ctrfReport.results.summary.other += 1;
				break;
		}
	}

	private updateCtrfTestResultsFromTestStats(
		test: TestStats,
		status: TestStatus,
	): void {
		const logicalId = this.identity(test);
		const currentIndex = this.ctrfReport.results.tests.findLastIndex(
			(entry) => entry.testId === logicalId && entry.status === "failed",
		);
		const currentPrior =
			(test.retries ?? 0) > 0 && currentIndex >= 0
				? this.ctrfReport.results.tests[currentIndex]
				: undefined;
		const previousTest =
			currentPrior ??
			this.previousReport?.results.tests.find(
				(entry) => entry.testId === logicalId,
			);
		const ctrfTest: CtrfTest = {
			testId: logicalId,
			executionId: previousTest?.executionId ?? crypto.randomUUID(),
			attemptId: crypto.randomUUID(),
			name: test.title,
			status,
			duration: Math.max(0, Math.round(test._duration ?? 0)),
		};

		if (this.reporterConfigOptions.minimal === false) {
			ctrfTest.start = test.start.getTime();
			if (test.end) {
				ctrfTest.stop = test.end.getTime();
			}
			ctrfTest.message = this.extractFailureDetails(test).message;
			ctrfTest.trace = this.extractFailureDetails(test).trace;
			ctrfTest.rawStatus = test.state;
			ctrfTest.type = this.reporterConfigOptions.testType ?? "e2e";

			const frameworkRetries = Math.max(0, test.retries ?? 0);
			if (previousTest?.status === "failed") {
				ctrfTest.retryAttempts = [
					...(previousTest.retryAttempts ?? []),
					{
						attempt: (previousTest.retryAttempts?.length ?? 0) + 1,
						attemptId: previousTest.attemptId ?? crypto.randomUUID(),
						status: previousTest.status,
						duration: previousTest.duration,
						message: previousTest.message,
						trace: previousTest.trace,
						start: previousTest.start,
						stop: previousTest.stop,
					},
				];
				ctrfTest.retries = ctrfTest.retryAttempts.length;
			} else {
				ctrfTest.retries = frameworkRetries;
				if (frameworkRetries > 0) {
					ctrfTest.retryAttempts = Array.from(
						{ length: frameworkRetries },
						(_, index) => ({
							attempt: index + 1,
							attemptId: crypto.randomUUID(),
							status: "failed",
						}),
					);
				}
			}

			if (previousTest) {
				if (previousTest.status === "failed") {
					ctrfTest.flaky = test.state === "passed";
				} else {
					ctrfTest.flaky = false;
				}
			} else {
				ctrfTest.flaky = test.state === "passed" && (test.retries ?? 0) > 0;
			}
			ctrfTest.suite = [this.currentSuite];
			ctrfTest.filePath = this.currentSpecFile;
			ctrfTest.browser = this.currentBrowser;
		}

		// Add runtime metadata (extra) if present
		const metadata = this.testMetadata.get(this.identity(test));
		if (metadata && Object.keys(metadata.extra).length > 0) {
			ctrfTest.extra = metadata.extra as Record<string, any>;
		}

		if (currentPrior) {
			this.ctrfReport.results.tests.splice(currentIndex, 1);
			this.ctrfReport.results.summary.tests--;
			this.ctrfReport.results.summary[currentPrior.status]--;
		}
		this.ctrfReport.results.tests.push(ctrfTest);
	}

	hasEnvironmentDetails(environment: Environment): boolean {
		return Object.keys(environment).length > 0;
	}

	extractFailureDetails(testResult: TestStats): Partial<CtrfTest> {
		if (testResult.state === "failed" && testResult.error) {
			const failureDetails: Partial<CtrfTest> = {};
			if (testResult.error.message) {
				failureDetails.message = testResult.error.message;
			}
			if (testResult.error.stack) {
				failureDetails.trace = testResult.error.stack;
			}
			return failureDetails;
		}
		return {};
	}

	private getReportPath(fileName: string): string {
		return path.join(this.outputDir, fileName);
	}

	private writeReportToFile(data: CTRFReport, fileName: string): void {
		const filePath = this.getReportPath(fileName);
		const str = JSON.stringify(data, null, 2);
		try {
			fs.writeFileSync(filePath, str + "\n");
		} catch (e) {
			console.error(`CTRF: Error writing report ${String(e)}`);
		}
	}
}
