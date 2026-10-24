const assert = require("node:assert/strict");
const fs = require("node:fs");
const { ctrf } = require("wdio-ctrf-json-reporter");
const mode = process.env.CTRF_FIXTURE_MODE;
function record(test, extra) {
	fs.appendFileSync(
		process.env.CTRF_NATIVE_ACTIONS,
		JSON.stringify({
			pid: process.pid,
			title: test.title,
			suite: test.parent.fullTitle(),
			extra,
		}) + "\n",
	);
}
describe("suite", () => {
	if (mode === "all-skipped") {
		it.skip("skip", () => {});
		it("pending");
		return;
	}
	it("pass", async function () {
		await browser.url(
			"data:text/html,<title>CTRF fixture</title><h1>CTRF fixture</h1>",
		);
		assert.equal(await browser.getTitle(), "CTRF fixture");
		ctrf.extra({ owner: "first", nested: { a: 1 }, list: ["one"] });
		ctrf.extra({ owner: "last", nested: { b: 2 }, list: ["two"] });
		record(this.test, {
			owner: "last",
			nested: { a: 1, b: 2 },
			list: ["one", "two"],
		});
	});
	it("isolated", function () {
		ctrf.extra({ isolated: true });
		record(this.test, { isolated: true });
	});
	it("unicode ✓", () => {});
	if (mode === "mixed") {
		it.skip("skip", () => {});
		it("pending");
		it("flaky", function () {
			this.retries(1);
			assert.equal(this.test.currentRetry(), 1, "first failure");
		});
		it("failure", function () {
			this.retries(2);
			throw Error("fixture failure");
		});
	}
	if (mode === "spec-retry")
		it("spec retry", () => {
			const marker = process.env.CTRF_SPEC_MARKER;
			if (!fs.existsSync(marker)) {
				fs.writeFileSync(marker, "first attempt");
				throw Error("first spec attempt failure");
			}
		});
	describe("first", () => {
		it("duplicate", () => {});
	});
	describe("second", () => {
		it("duplicate", () => {});
	});
});
