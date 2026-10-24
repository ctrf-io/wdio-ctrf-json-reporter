import assert from "node:assert/strict";
import { assertNativeScenario, findNativeForReport } from "./evidence.mjs";
import { spawnSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
	rmSync,
	readdirSync,
	existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { configuredOptions, expectedReport } from "../expected.mjs";
import { catalogue, checkEntry } from "../shared/checks.mjs";
export function integrationContext(root, diagnostics) {
	const consumer = mkdtempSync(path.join(tmpdir(), "ctrf-wdio-consumer-"));
	const npm = process.platform === "win32" ? "npm.cmd" : "npm";
	const env = { ...process.env, CI: "true", FORCE_COLOR: "0" };
	delete env.NODE_PATH;
	delete env.NODE_OPTIONS;
	if (
		!env.CTRF_CHROME_BINARY &&
		process.platform === "darwin" &&
		existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
	)
		env.CTRF_CHROME_BINARY =
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
	env.CTRF_BROWSER_CACHE =
		process.env.CTRF_BROWSER_CACHE ?? path.join(consumer, "browser-cache");
	function execute(command, args, name, expected = 0) {
		const result = spawnSync(command, args, {
			cwd: consumer,
			env,
			encoding: "utf8",
			timeout: 300000,
			maxBuffer: 16 * 1024 * 1024,
		});
		if (diagnostics)
			writeFileSync(
				path.join(diagnostics, `${name}.log`),
				`${result.stdout ?? ""}\n${result.stderr ?? ""}\n${result.error ?? ""}`,
			);
		assert.ifError(result.error);
		assert.equal(result.signal, null, name);
		assert.equal(
			result.status,
			expected,
			`${name}: expected exit ${expected}\n${result.stdout}\n${result.stderr}`,
		);
		return result;
	}
	try {
		const pkg = JSON.parse(readFileSync(path.join(root, "package.json")));
		const packed = JSON.parse(
			execute(npm, ["pack", root, "--json", "--ignore-scripts"], "pack").stdout,
		)[0];
		assert.ok(
			packed.files.every((f) => !f.path.startsWith("tests/")),
			"Test sources leaked into package",
		);
		writeFileSync(
			path.join(consumer, "package.json"),
			JSON.stringify({ private: true }),
		);
		execute(
			npm,
			[
				"install",
				"--ignore-scripts",
				"--no-audit",
				"--no-fund",
				"--save-exact",
				`./${packed.filename}`,
				...["@wdio/cli", "@wdio/local-runner", "@wdio/mocha-framework"].map(
					(name) => `${name}@${pkg.devDependencies[name]}`,
				),
			],
			"install",
		);
		cpSync(
			new URL("./fixtures/", import.meta.url),
			path.join(consumer, "fixtures"),
			{ recursive: true },
		);
		const samples = [];
		for (const scenario of [
			{ name: "full", mode: "mixed", options: configuredOptions, exit: 1 },
			{ name: "repeated", mode: "mixed", options: configuredOptions, exit: 1 },
			{
				name: "workers",
				mode: "passed",
				options: configuredOptions,
				exit: 0,
				workers: true,
			},
			{ name: "minimal", mode: "mixed", options: { minimal: true }, exit: 1 },
			{ name: "defaults", mode: "passed", options: {}, exit: 0 },
			{
				name: "custom-type",
				mode: "passed",
				options: { testType: "component" },
				exit: 0,
			},
			{
				name: "custom-identity",
				mode: "passed",
				options: { customIdentity: true },
				exit: 0,
			},
			{
				name: "hooks-and-timeout",
				mode: "hooks",
				options: {},
				exit: 1,
				files: "fixtures/hooks.e2e.js",
			},
			{ name: "all-skipped", mode: "all-skipped", options: {}, exit: 0 },
			{
				name: "spec-retry",
				mode: "spec-retry",
				options: configuredOptions,
				exit: 0,
			},
			{
				name: "shard-one",
				mode: "passed",
				options: { ...configuredOptions, shardId: "one" },
				exit: 0,
			},
			{
				name: "shard-two",
				mode: "passed",
				options: { ...configuredOptions, shardId: "two" },
				exit: 0,
				files: "fixtures/second.e2e.js",
			},
			{
				name: "fractional-build-number",
				mode: "passed",
				options: { buildNumber: 1.5 },
				exit: 0,
			},
			{
				name: "nonfinite-build-number",
				mode: "passed",
				options: { buildNumber: Infinity },
				exit: 0,
			},
		]) {
			const outputDir = path.join(consumer, scenario.name);
			mkdirSync(outputDir);
			env.CTRF_FIXTURE_SCENARIO = scenario.name;
			env.CTRF_FIXTURE_MODE = scenario.mode;
			env.CTRF_FIXTURE_OPTIONS = JSON.stringify({
				...scenario.options,
				outputDir,
			});
			env.CTRF_WORKERS = String(!!scenario.workers);
			env.CTRF_SPECS = scenario.workers
				? "fixtures/cases.e2e.js,fixtures/second.e2e.js"
				: (scenario.files ?? "fixtures/cases.e2e.js");
			env.CTRF_NATIVE_DIR = path.join(outputDir, "native");
			mkdirSync(env.CTRF_NATIVE_DIR);
			env.CTRF_LOGS = path.join(outputDir, "logs");
			env.CTRF_NATIVE_ACTIONS = path.join(outputDir, "actions.jsonl");
			env.CTRF_SPEC_MARKER = path.join(outputDir, "spec-retry-marker");
			const start = Date.now();
			console.log(`Running real WebdriverIO: ${scenario.name}`);
			execute(
				process.execPath,
				["node_modules/@wdio/cli/bin/wdio.js", "run", "fixtures/wdio.conf.cjs"],
				scenario.name,
				scenario.exit,
			);
			const natives = readdirSync(env.CTRF_NATIVE_DIR).map((f) =>
				JSON.parse(readFileSync(path.join(env.CTRF_NATIVE_DIR, f))),
			);
			assert.ok(natives.length, "No native runner evidence");
			assertNativeScenario(natives, scenario);
			const actions = existsSync(env.CTRF_NATIVE_ACTIONS)
				? readFileSync(env.CTRF_NATIVE_ACTIONS, "utf8")
						.trim()
						.split("\n")
						.filter(Boolean)
						.map(JSON.parse)
				: [];
			if (scenario.workers) {
				assert.equal(natives.length, 2, "Expected two workers");
				assert.equal(
					new Set(natives.map((n) => n.pid)).size,
					2,
					"Workers did not use separate processes",
				);
				assert.equal(
					new Set(actions.map((a) => a.pid)).size,
					2,
					"Each worker must prove browser/test execution",
				);
			}
			if (scenario.name === "spec-retry")
				assert.equal(natives.length, 2, "Spec file was not retried");
			const files = readdirSync(outputDir).filter(
				(f) => f.startsWith("ctrf-") && f.endsWith(".json"),
			);
			assert.equal(
				files.length,
				scenario.workers ? 2 : 1,
				"Unexpected report file count",
			);
			for (const [index, file] of files.entries()) {
				const bytes = readFileSync(path.join(outputDir, file));
				const report = JSON.parse(bytes);
				let native;
				if (scenario.name === "spec-retry") {
					natives.sort((a, b) => a.startedAt - b.startedAt);
					native = {
						runner: natives.at(-1).runner,
						events: natives.flatMap((n) => n.events),
						actions,
					};
				} else {
					native = scenario.workers
						? findNativeForReport(file, natives, scenario.options)
						: natives[0];
					assert.ok(native, "Missing native worker for emitted file");
					native = { ...native, actions };
				}
				const name = scenario.workers ? `workers-${index}` : scenario.name;
				samples.push({
					name,
					report,
					base64: bytes.toString("base64"),
					expected: expectedReport(native, scenario.options),
					runWindow: [start, Date.now()],
				});
				if (diagnostics) {
					writeFileSync(path.join(diagnostics, `${name}-subject.json`), bytes);
					writeFileSync(
						path.join(diagnostics, `${name}-native.json`),
						JSON.stringify(native, null, 2),
					);
				}
			}
		}
		const original = samples[0];
		for (const [rule, mutate] of [
			[
				"single-json-object",
				(r) => {
					r.results.tests[0].duration = "invalid";
				},
			],
			[
				"summary-matches-final-results",
				(r) => {
					r.results.summary.passed++;
				},
			],
			[
				"retry-count-matches-history-length",
				(r) => {
					r.results.tests.find((t) => t.retries > 0).retries++;
				},
			],
			[
				"history-excludes-final-attempt",
				(r) => {
					r.results.tests.find((t) => t.retries > 0).retryAttempts[0].duration =
						999999;
				},
			],
		]) {
			const report = structuredClone(original.report);
			mutate(report);
			assert.throws(
				() =>
					checkEntry(
						catalogue.entries.find((e) => e.rule === rule),
						{
							samples: [
								{
									...original,
									report,
									bytes: Buffer.from(JSON.stringify(report)),
								},
							],
						},
					),
				`Corruption accepted: ${rule}`,
			);
		}
		return {
			samples,
			repeated: ["full", "repeated"],
			shards: ["shard-one", "shard-two"],
			warnings: [],
		};
	} finally {
		rmSync(consumer, { recursive: true, force: true });
	}
}
