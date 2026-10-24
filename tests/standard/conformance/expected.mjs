export const configuredOptions = {
	runId: "standard-run",
	shardId: "standard-shard",
	appName: "fixture-app",
	appVersion: "2.0.0",
	buildName: "standard-build",
	buildNumber: 0,
	buildUrl: "https://example.test/build/0",
	osPlatform: "fixture-platform",
	osRelease: "fixture-release",
	osVersion: "fixture-version",
};
const milliseconds = (value) =>
	typeof value === "string"
		? Date.parse(value)
		: value instanceof Date
			? value.getTime()
			: value;
export function expectedReport(native, options = {}) {
	const groups = new Map();
	for (const event of native.events) {
		const key = JSON.stringify([event.file, event.suite, event.title]);
		const group = groups.get(key) ?? [];
		group.push(event);
		groups.set(key, group);
	}
	const tests = [...groups.values()]
		.filter((events) => events.some((e) => e.kind === "end"))
		.map((events) => {
			const final = events.findLast((e) => e.kind === "end");
			const lastIndex = events.lastIndexOf(final);
			const prior = events
				.slice(0, lastIndex)
				.filter((e) => e.state === "failed");
			const base = {
				name: final.title,
				status: final.state,
				duration: Math.max(0, Math.round(final.duration ?? 0)),
			};
			if (options.customIdentity)
				base.testId = `custom:${final.suite}:${final.title}`;
			const action = native.actions?.find(
				(a) =>
					a.title === final.title &&
					a.suite === final.suite &&
					(!a.file || a.file === final.file),
			);
			if (action?.extra) base.extra = action.extra;
			if (options.minimal) return base;
			return {
				...base,
				rawStatus: final.state,
				type: options.testType ?? "e2e",
				suite: [final.suite],
				filePath: final.file,
				browser: [
					native.runner.capabilities.browserName,
					native.runner.capabilities.browserVersion,
				]
					.filter(Boolean)
					.join(" "),
				start: milliseconds(final.start),
				...(final.end ? { stop: milliseconds(final.end) } : {}),
				...(final.state === "failed" && final.error
					? { message: final.error.message, trace: final.error.stack }
					: {}),
				retries: prior.length,
				flaky: final.state === "passed" && prior.length > 0,
				sourceAttempts: [
					...prior.map((e) => ({
						status: e.state,
						...(e.kind === "end"
							? { duration: Math.max(0, Math.round(e.duration ?? 0)) }
							: {}),
					})),
					{ status: final.state, duration: base.duration },
				],
			};
		});
	const summary = { tests: tests.length };
	for (const state of ["passed", "failed", "pending", "skipped", "other"])
		summary[state] = tests.filter((t) => t.status === state).length;
	const environment = {
		...Object.fromEntries(
			Object.keys(configuredOptions)
				.filter((k) => k !== "runId" && options[k] !== undefined)
				.map((k) => [k, options[k]]),
		),
		shardId: options.shardId ?? native.runner.cid,
		extra: native.runner.capabilities,
	};
	return {
		reportFormat: "CTRF",
		specVersion: "0.2.0",
		generatedBy: "wdio-ctrf-json-reporter",
		...(options.runId ? { runId: options.runId } : {}),
		results: { tool: { name: "webdriverio" }, summary, tests, environment },
	};
}
