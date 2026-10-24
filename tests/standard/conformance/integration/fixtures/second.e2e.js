const fs = require("node:fs");
const { ctrf } = require("wdio-ctrf-json-reporter/runtime");
describe("second file", () => {
	it("pass", async function () {
		await browser.url("data:text/html,<title>Second worker</title>");
		const title = await browser.getTitle();
		if (title !== "Second worker")
			throw Error("Real browser execution missing");
		ctrf.extra({ file: "second" });
		fs.appendFileSync(
			process.env.CTRF_NATIVE_ACTIONS,
			JSON.stringify({
				pid: process.pid,
				title: this.test.title,
				suite: this.test.parent.fullTitle(),
				extra: { file: "second" },
			}) + "\n",
		);
	});
});
