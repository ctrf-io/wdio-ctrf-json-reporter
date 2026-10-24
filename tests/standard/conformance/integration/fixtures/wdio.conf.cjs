const path = require("node:path");
const Reporter = require("./native-reporter.cjs");
const options = JSON.parse(process.env.CTRF_FIXTURE_OPTIONS);
if (process.env.CTRF_FIXTURE_SCENARIO === "nonfinite-build-number")
	options.buildNumber = Infinity;
if (options.customIdentity)
	options.testIdResolver = ({ name, suite }) => `custom:${suite[0]}:${name}`;
exports.config = {
	runner: "local",
	framework: "mocha",
	specs: process.env.CTRF_SPECS.split(",").map((spec) => path.resolve(spec)),
	maxInstances: process.env.CTRF_WORKERS === "true" ? 2 : 1,
	logLevel: "error",
	outputDir: process.env.CTRF_LOGS,
	cacheDir: process.env.CTRF_BROWSER_CACHE,
	connectionRetryCount: 0,
	connectionRetryTimeout: 30000,
	capabilities: [
		{
			browserName: "chrome",
			"goog:chromeOptions": {
				...(process.env.CTRF_CHROME_BINARY
					? { binary: process.env.CTRF_CHROME_BINARY }
					: {}),
				args: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"],
			},
		},
	],
	reporters: [[Reporter, options]],
	mochaOpts: { ui: "bdd", timeout: 2000 },
	specFileRetries: process.env.CTRF_FIXTURE_MODE === "spec-retry" ? 1 : 0,
};
