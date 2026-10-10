import { describe, it, expect } from "vitest";
import { identityValue, testIdentity } from "../src/identity";

describe("identity semantics", () => {
	it("normalizes paths but preserves suite component boundaries", () => {
		const a = {
			name: "same",
			suite: ["a/b", "c"],
			filePath: "tests\\example.ts",
		};
		expect(testIdentity("runner", a)).toBe(
			testIdentity("runner", { ...a, filePath: "tests/example.ts" }),
		);
		expect(testIdentity("runner", a)).not.toBe(
			testIdentity("runner", { ...a, suite: ["a", "b/c"] }),
		);
		expect(testIdentity("runner", a)).not.toBe(
			testIdentity("runner", { ...a, filePath: "tests/other.ts" }),
		);
	});
	it("includes only explicitly supplied run identity", () => {
		for (const runId of [undefined, "", "coordinated-run"]) {
			const reporter = new Reporter({
				runId,
				stdout: true,
				writeStream: process.stdout,
			});
			expect(JSON.parse(JSON.stringify(reporter.ctrfReport)).runId).toBe(
				runId || undefined,
			);
		}
		expect(() => identityValue(" ", "shardId")).toThrow();
	});
	it("supports an explicit case resolver without allowing empty identity", () => {
		expect(
			testIdentity(
				"runner",
				{ name: "duplicate" },
				{ testIdResolver: () => "stable-case" },
			),
		).toBe("stable-case");
		expect(() =>
			testIdentity(
				"runner",
				{ name: "duplicate" },
				{ testIdResolver: () => "" },
			),
		).toThrow();
	});
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Reporter from "../src/reporter";
import { validateStrict } from "ctrf";

describe("worker and retry identity", () => {
	it("joins declared same-run spec retries and isolates unrelated runs and workers", () => {
		const directory = fs.mkdtempSync(
			path.join(os.tmpdir(), "ctrf-wdio-identity-"),
		);
		try {
			const spec = path.join(directory, "case.ts");
			const make = (runId?: string, cid = "0-0") => {
				const reporter = new Reporter({
					outputDir: directory,
					runId,
					stdout: true,
					writeStream: process.stdout,
				});
				const execute = (retry: number, status: "failed" | "passed") => {
					const runner = {
						cid,
						specs: [spec],
						capabilities: { browserName: "chrome" },
						retries: retry,
					};
					reporter.onRunnerStart(runner as never);
					reporter.onSuiteStart({
						title: "suite",
						fullTitle: "suite",
						file: spec,
					} as never);
					const test = {
						title: "case",
						state: status,
						start: new Date(1),
						end: new Date(2),
						_duration: 1,
					};
					reporter.onTestStart(test as never);
					reporter.onTestEnd(test as never);
					reporter.onRunnerEnd(runner as never);
					expect(() =>
						validateStrict(reporter.ctrfReport, { specVersion: "0.2.0" }),
					).not.toThrow();
					return reporter.ctrfReport.results.tests[0];
				};
				return { reporter, execute };
			};
			const same = make("coordinated");
			const first = same.execute(0, "failed");
			const second = same.execute(1, "failed");
			const final = same.execute(2, "passed");
			expect(second.executionId).toBe(first.executionId);
			expect(first.attemptId).toBeTruthy();
			expect(second.retryAttempts?.[0].attemptId).toBe(first.attemptId);
			expect(final.retryAttempts?.[1].attemptId).toBe(second.attemptId);
			expect(final.attemptId).toBeTruthy();
			expect(
				final.retryAttempts?.map((attempt) => attempt.attemptId),
			).not.toContain(final.attemptId);
			expect(final.executionId).toBe(first.executionId);
			expect(
				new Set(final.retryAttempts?.map((attempt) => attempt.attemptId)).size,
			).toBe(2);
			const unrelated = make("another-run").execute(1, "passed");
			expect(unrelated.executionId).not.toBe(first.executionId);
			expect(unrelated.retries).toBe(0);
			const unknown = make();
			const unknownFirst = unknown.execute(0, "failed");
			const unknownRetry = unknown.execute(1, "passed");
			expect(unknownRetry.executionId).not.toBe(unknownFirst.executionId);
			expect(unknownRetry.retries).toBe(0);
			make("coordinated", "0-1").execute(0, "passed");
			expect(
				fs.readdirSync(directory).filter((name) => name.endsWith(".json")),
			).toHaveLength(2);
		} finally {
			fs.rmSync(directory, { recursive: true, force: true });
		}
	});
});
