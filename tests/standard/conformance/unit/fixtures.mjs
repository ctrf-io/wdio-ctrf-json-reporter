import { createRequire } from "node:module";
import {
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { configuredOptions, expectedReport } from "../expected.mjs";
const require = createRequire(import.meta.url);
const Reporter = require("../../../../dist/index.cjs");
export function unitContext() {
	const directory = mkdtempSync(path.join(tmpdir(), "ctrf-wdio-unit-"));
	const samples = [];
	try {
		for (const [name, options, mode] of [
			["full", configuredOptions],
			["repeated", configuredOptions],
			["minimal", { minimal: true }],
			["defaults", {}],
			["empty-run-id", { runId: "" }],
			["empty-run", {}, "empty"],
			["custom-type", { testType: "component" }],
			[
				"custom-identity",
				{
					customIdentity: true,
					testIdResolver: ({ name, suite }) => `custom:${suite[0]}:${name}`,
				},
			],
			["shard-one", { ...configuredOptions, shardId: "one" }],
			["shard-two", { ...configuredOptions, shardId: "two" }],
			["fractional-build-number", { buildNumber: 1.5 }],
			["nonfinite-build-number", { buildNumber: Infinity }],
		]) {
			const outputDir = path.join(directory, name);
			mkdirSync(outputDir);
			const started = Date.now();
			const reporter = new Reporter({
				...options,
				outputDir,
				stdout: true,
				writeStream: process.stdout,
			});
			const runner = {
				cid: "0-0",
				capabilities: {
					browserName: "chrome",
					browserVersion: "fixture-version",
					platformName: "fixture-platform",
				},
				specs: [path.resolve("fixture/cases.e2e.js")],
			};
			reporter.onRunnerStart(runner);
			const suite = { fullTitle: "suite", file: runner.specs[0] };
			reporter.onSuiteStart(suite);
			const events = [];
			const actions = [];
			for (const [title, state, retries] of mode === "empty"
				? []
				: [
						["pass", "passed", 0],
						["zero", "passed", 0],
						["failure", "failed", 2],
						["flaky", "passed", 1],
						["skip", "skipped", 0],
						["pending", "pending", 0],
						["duplicate", "passed", 0],
						["duplicate", "passed", 0],
					]) {
				const scope =
					title === "duplicate" && events.at(-1)?.title === "duplicate"
						? { fullTitle: "second", file: runner.specs[0] }
						: suite;
				reporter.onSuiteStart(scope);
				for (let attempt = 0; attempt <= retries; attempt++) {
					const outcome = attempt < retries ? "failed" : state;
					const duration = title === "zero" ? 0 : 12 + attempt;
					const start = new Date(Date.now() - duration);
					const end = new Date();
					const error =
						outcome === "failed"
							? {
									message: `attempt ${attempt + 1} fixture failure`,
									stack: `Error: attempt ${attempt + 1} fixture failure\n at fixture.js:1:1`,
								}
							: undefined;
					const test = {
						title,
						state: outcome,
						retries: attempt,
						start,
						end,
						_duration: duration,
						error,
					};
					reporter.onTestStart(test);
					if (title === "pass") {
						Reporter.ctrf.extra({
							owner: "first",
							nested: { a: 1 },
							list: ["one"],
						});
						Reporter.ctrf.extra({
							owner: "last",
							nested: { b: 2 },
							list: ["two"],
						});
						actions.push({
							title,
							suite: scope.fullTitle,
							file: scope.file,
							extra: {
								owner: "last",
								nested: { a: 1, b: 2 },
								list: ["one", "two"],
							},
						});
					}
					events.push({
						kind: "end",
						title,
						state: outcome,
						retries: attempt,
						start: start.toISOString(),
						end: end.toISOString(),
						duration,
						error,
						suite: scope.fullTitle,
						file: scope.file,
					});
					reporter.onTestEnd(test);
				}
			}
			reporter.onRunnerEnd(runner);
			const files = readdirSync(outputDir).filter((f) => f.endsWith(".json"));
			if (files.length !== 1)
				throw Error("Unit producer did not emit exactly one report");
			const bytes = readFileSync(path.join(outputDir, files[0]));
			samples.push({
				name,
				bytes,
				report: JSON.parse(bytes),
				expected: expectedReport({ runner, events, actions }, options),
				runWindow: [started, Date.now()],
			});
		}
		return {
			samples,
			repeated: samples.slice(0, 2),
			shards: samples.filter((s) => s.name.startsWith("shard-")),
			warnings: [],
		};
	} finally {
		delete globalThis.__ctrfTestRuntime;
		rmSync(directory, { recursive: true, force: true });
	}
}
