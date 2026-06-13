import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";
import Reporter, {
	CTRF_RUNTIME_KEY,
	ctrf,
	extra,
} from "wdio-ctrf-json-reporter";

const require = createRequire(import.meta.url);

describe("package exports", () => {
	test("supports ESM default and named imports", () => {
		expect(typeof Reporter).toBe("function");
		expect(Reporter.name).toBe("GenerateCtrfReport");
		expect(typeof extra).toBe("function");
		expect(typeof ctrf.extra).toBe("function");
		expect(typeof CTRF_RUNTIME_KEY).toBe("string");
	});

	test("supports CJS require from the package root", () => {
		const CjsReporter = require("wdio-ctrf-json-reporter");

		expect(typeof CjsReporter).toBe("function");
		expect(CjsReporter.name).toBe("GenerateCtrfReport");
		expect(typeof CjsReporter.extra).toBe("function");
		expect(typeof CjsReporter.ctrf.extra).toBe("function");
		expect(typeof CjsReporter.CTRF_RUNTIME_KEY).toBe("string");
	});

	test("supports CJS require from the runtime subpath", () => {
		const runtime = require("wdio-ctrf-json-reporter/runtime");

		expect(typeof runtime.extra).toBe("function");
		expect(typeof runtime.ctrf.extra).toBe("function");
	});
});
