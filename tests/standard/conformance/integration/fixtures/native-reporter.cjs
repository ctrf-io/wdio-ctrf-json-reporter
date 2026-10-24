const fs = require("node:fs");
const path = require("node:path");
const Reporter = require("wdio-ctrf-json-reporter");
module.exports = class NativeObservedReporter extends Reporter {
	onRunnerStart(runner) {
		this.native = {
			pid: process.pid,
			startedAt: Date.now(),
			runner: {
				cid: runner.cid,
				retry: runner.retry,
				retries: runner.retries,
				specs: [...runner.specs],
				capabilities: JSON.parse(JSON.stringify(runner.capabilities)),
			},
			events: [],
		};
		super.onRunnerStart(runner);
	}
	onSuiteStart(suite) {
		this.nativeSuite = { suite: suite.fullTitle, file: suite.file };
		super.onSuiteStart(suite);
	}
	snapshot(kind, test) {
		this.native.events.push({
			...this.nativeSuite,
			kind,
			title: test.title,
			state: test.state,
			retries: test.retries,
			start: test.start,
			end: test.end,
			duration: test._duration,
			error: test.error
				? { message: test.error.message, stack: test.error.stack }
				: undefined,
		});
	}
	onTestRetry(test) {
		this.snapshot("retry", test);
		super.onTestRetry(test);
	}
	onTestEnd(test) {
		this.snapshot("end", test);
		super.onTestEnd(test);
	}
	onRunnerEnd(runner) {
		super.onRunnerEnd(runner);
		fs.writeFileSync(
			path.join(
				process.env.CTRF_NATIVE_DIR,
				`${runner.cid}-${process.pid}.json`,
			),
			JSON.stringify(this.native),
		);
	}
};
