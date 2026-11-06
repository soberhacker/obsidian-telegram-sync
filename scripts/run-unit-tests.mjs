import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const mockServices = path.join(root, "tests/support/services.ts");
const serviceModules = new Set(
	[
		"src/telegram/bot/message/processors.ts",
		"src/telegram/bot/message/filterEvaluations.ts",
		"src/telegram/bot/bot.ts",
		"src/telegram/user/config.ts",
		"src/telegram/user/client.ts",
		"src/telegram/user/sync.ts",
		"src/telegram/bot/progressBar.ts",
		"src/settings/messageDistribution.ts",
		"src/utils/fsUtils.ts",
		"src/utils/dateUtils.ts",
		"src/utils/logUtils.ts",
		"src/utils/queues.ts",
	].map((value) => path.join(root, value)),
);

await build({
	entryPoints: ["tests/richMessage.test.ts", "tests/richMessageImport.test.ts", "tests/richMessageTemplates.test.ts"],
	outdir: ".test-build",
	outExtension: { ".js": ".cjs" },
	bundle: true,
	platform: "node",
	format: "cjs",
	target: "node18",
	logLevel: "warning",
	plugins: [
		{
			name: "mock-obsidian-and-import-services",
			setup(builder) {
				builder.onResolve({ filter: /.*/ }, (args) => {
					if (args.path === "obsidian") return { path: mockServices };
					if (!args.importer || args.importer === mockServices) return;
					const target = args.path.startsWith(".")
						? path.resolve(path.dirname(args.importer), args.path)
						: path.resolve(root, args.path);
					if (args.importer.endsWith("richMessageTemplates.test.ts") && target.endsWith("processors")) return;
					if (serviceModules.has(target + ".ts")) return { path: mockServices };
				});
			},
		},
	],
});

const result = spawnSync(
	process.execPath,
	[
		"--test",
		".test-build/richMessage.test.cjs",
		".test-build/richMessageImport.test.cjs",
		".test-build/richMessageTemplates.test.cjs",
	],
	{ stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
