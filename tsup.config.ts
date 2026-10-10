import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: {
			index: "src/index.ts",
			runtime: "src/runtime.ts",
		},
		format: ["esm"],
		dts: {
			// tsup injects baseUrl; scope this option to the TypeScript 6 API build.
			compilerOptions: { ignoreDeprecations: "6.0" },
			entry: {
				index: "src/index.ts",
				runtime: "src/runtime.ts",
			},
		},
		clean: true,
		external: ["@wdio/reporter", "@wdio/types"],
		shims: true,
		splitting: false,
		outDir: "dist",
	},
	{
		entry: {
			"index.generated": "src/index.ts",
			runtime: "src/runtime.ts",
		},
		format: ["cjs"],
		dts: false,
		clean: false,
		external: ["@wdio/reporter", "@wdio/types"],
		shims: true,
		splitting: false,
		outDir: "dist",
	},
]);
