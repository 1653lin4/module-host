import esbuild from "esbuild";
import process from "process";

const isProd = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "node:fs/promises", "node:path", "node:url"],
  format: "cjs",
  target: "es2022",
  platform: "node",
  sourcemap: !isProd ? "inline" : false,
  outfile: "main.js",
});

if (isProd) {
  await context.rebuild();
  console.log("⚡ [esbuild] Module Host 纯净底座生产构建完成！");
  process.exit(0);
} else {
  await context.watch();
  console.log("⚡ [esbuild] Module Host 正在监听修改中...");
}