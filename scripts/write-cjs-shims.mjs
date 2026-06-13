import { writeFileSync } from "node:fs";

writeFileSync(
	"dist/index.cjs",
	`"use strict";

const mod = require("./index.generated.cjs");
const Reporter = mod.default || mod;

module.exports = Object.assign(Reporter, {
  CTRF_RUNTIME_KEY: mod.CTRF_RUNTIME_KEY,
  ctrf: mod.ctrf,
  extra: mod.extra,
});
`,
);
