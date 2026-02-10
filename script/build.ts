import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, writeFile, cp } from "fs/promises";
import path from "path";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Build Vercel output if VERCEL environment is detected
  if (process.env.VERCEL) {
    console.log("building vercel output...");

    // Bundle the serverless function (all deps included)
    await esbuild({
      entryPoints: ["server/vercel.ts"],
      platform: "node",
      bundle: true,
      format: "esm",
      outfile: ".vercel/output/functions/api.func/index.mjs",
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      banner: {
        js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
      minify: true,
      logLevel: "info",
    });

    // Write the function config
    await writeFile(
      ".vercel/output/functions/api.func/.vc-config.json",
      JSON.stringify({
        runtime: "nodejs20.x",
        handler: "index.mjs",
        launcherType: "Nodejs",
      })
    );

    // Copy static files
    await cp("dist/public", ".vercel/output/static", { recursive: true });

    // Write the output config with routing rules
    await writeFile(
      ".vercel/output/config.json",
      JSON.stringify({
        version: 3,
        routes: [
          { src: "/api/(.*)", dest: "/api" },
          { handle: "filesystem" },
          { src: "/(.*)", dest: "/index.html" },
        ],
      })
    );

    console.log("vercel output ready at .vercel/output/");
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
