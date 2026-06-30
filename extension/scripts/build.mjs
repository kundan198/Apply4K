// Build script for the Apply4K MV3 extension.
// Emits a loadable unpacked extension into extension/dist:
//   manifest.json, background.js, content.js, popup.js, popup.html, popup.css, icons/*
//
// Uses esbuild for JS/TS bundling and PostCSS (Tailwind + autoprefixer) for CSS.
// No Vite plugin dependency -> robust, deterministic output.

import { build, context } from "esbuild";
import postcss from "postcss";
import tailwind from "tailwindcss";
import autoprefixer from "autoprefixer";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import {
  rmSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync
} from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dist = join(root, "dist");
const watch = process.argv.includes("--watch");

function clean() {
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  mkdirSync(join(dist, "icons"), { recursive: true });
}

// ---- CSS (Tailwind) ----
async function buildCss() {
  const inputPath = join(root, "src/popup/popup.css");
  const css = readFileSync(inputPath, "utf8");
  const result = await postcss([
    tailwind(join(root, "tailwind.config.js")),
    autoprefixer()
  ]).process(css, { from: inputPath, to: join(dist, "popup.css") });
  writeFileSync(join(dist, "popup.css"), result.css);
}

// ---- Static assets ----
function copyStatic() {
  copyFileSync(join(root, "manifest.json"), join(dist, "manifest.json"));
  copyFileSync(join(root, "public/popup.html"), join(dist, "popup.html"));
  const iconDir = join(root, "public/icons");
  if (existsSync(iconDir)) {
    for (const f of readdirSync(iconDir)) {
      copyFileSync(join(iconDir, f), join(dist, "icons", f));
    }
  }
}

const esbuildCommon = {
  bundle: true,
  format: "esm",
  target: "es2020",
  sourcemap: false,
  minify: !watch,
  logLevel: "info",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  loader: { ".png": "file" }
};

const entries = [
  {
    entryPoints: [join(root, "src/background/service-worker.ts")],
    outfile: join(dist, "background.js")
  },
  {
    entryPoints: [join(root, "src/content/index.ts")],
    outfile: join(dist, "content.js")
  },
  {
    entryPoints: [join(root, "src/popup/main.tsx")],
    outfile: join(dist, "popup.js")
  }
];

async function run() {
  clean();
  copyStatic();

  if (watch) {
    await buildCss();
    for (const e of entries) {
      const ctx = await context({ ...esbuildCommon, ...e });
      await ctx.watch();
    }
    console.log("esbuild watching… (CSS/static are not watched)");
  } else {
    await Promise.all(entries.map((e) => build({ ...esbuildCommon, ...e })));
    // Write the Tailwind CSS last so nothing can overwrite it.
    await buildCss();
    console.log("\nBuilt extension -> dist/");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
