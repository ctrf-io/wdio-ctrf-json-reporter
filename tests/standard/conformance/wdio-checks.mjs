import assert from "node:assert/strict";
import { checkEntry, valuesAt } from "./shared/checks.mjs";
export function checkWdioEntry(entry, context) {
	for (const sample of context.samples) {
		if (entry.path === "results.tests[].extra")
			assert.deepEqual(
				sample.report.results.tests.map((t) => t.extra),
				sample.expected.results.tests.map((t) => t.extra),
				`${sample.name}: runtime metadata source mapping`,
			);
		if (entry.path === "results.environment.extra")
			assert.deepEqual(
				sample.report.results.environment.extra,
				sample.expected.results.environment.extra,
				`${sample.name}: native capabilities source mapping`,
			);
	}
	checkEntry(entry, context);
}
export function assertNativeCapabilities(context, manifest, level) {
	for (const [path, declaration] of Object.entries(manifest.properties)) {
		const c = declaration.levels?.[level] ?? declaration;
		if (!c.supported)
			assert.equal(
				context.samples.flatMap((s) => valuesAt(s.report, path)).length,
				0,
				`Emitted field incorrectly unsupported at ${level}: ${path}`,
			);
	}
}
