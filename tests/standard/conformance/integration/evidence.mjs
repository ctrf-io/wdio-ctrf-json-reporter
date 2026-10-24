import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function findNativeForReport(file, natives, options) {
	const matches = natives.filter((n) => {
		const spec = n.runner.specs[0];
		const name = path
			.basename(spec.startsWith("file:") ? fileURLToPath(spec) : spec)
			.replace(/\.js$/, "");
		return file.endsWith(
			`${name}${options.shardId ? `-${encodeURIComponent(options.shardId)}` : ""}.json`,
		);
	});
	assert.equal(
		matches.length,
		1,
		"Report filename does not identify exactly one native spec",
	);
	return matches[0];
}
export function assertNativeScenario(natives, scenario) {
	const end = natives.flatMap((n) =>
		n.events
			.filter((e) => e.kind === "end")
			.map((e) => [e.suite, e.title, e.state]),
	);
	let expected;
	if (scenario.mode === "hooks")
		expected = [
			["hook failure", "unreached", "failed"],
			["hook failure", "skip after hook", "failed"],
			["timeout", "times out", "failed"],
		];
	else if (scenario.mode === "all-skipped")
		expected = [
			["suite", "skip", "skipped"],
			["suite", "pending", "skipped"],
		];
	else {
		const cases = [
			["suite", "pass", "passed"],
			["suite", "isolated", "passed"],
			["suite", "unicode ✓", "passed"],
			["suite.first", "duplicate", "passed"],
			["suite.second", "duplicate", "passed"],
		];
		expected =
			scenario.files === "fixtures/second.e2e.js"
				? [["second file", "pass", "passed"]]
				: [...cases];
		if (scenario.mode === "mixed")
			expected.push(
				["suite", "skip", "skipped"],
				["suite", "pending", "skipped"],
				["suite", "flaky", "passed"],
				["suite", "failure", "failed"],
			);
		if (scenario.workers) expected.push(["second file", "pass", "passed"]);
		if (scenario.mode === "spec-retry")
			expected = [
				...cases,
				["suite", "spec retry", "failed"],
				...cases,
				["suite", "spec retry", "passed"],
			];
	}
	const sort = (rows) =>
		rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
	assert.deepEqual(
		sort(end),
		sort(expected),
		"Native scenario inventory/outcomes differ",
	);
	for (const n of natives)
		for (const [title, count] of scenario.mode === "mixed"
			? [
					["flaky", 1],
					["failure", 2],
				]
			: [])
			assert.equal(
				n.events.filter((e) => e.kind === "retry" && e.title === title).length,
				count,
				`Missing native retry observations for ${title}`,
			);
}
