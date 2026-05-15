#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const runNext = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [nextBin, ...args], {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    });

    const forward = (signal) => child.kill(signal);
    process.on("SIGINT", forward);
    process.on("SIGTERM", forward);

    child.on("exit", (code, signal) => {
      process.off("SIGINT", forward);
      process.off("SIGTERM", forward);
      if (signal) {
        reject(new Error(`next ${args[0]} terminated by signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`next ${args[0]} exited with code ${code}`));
        return;
      }
      resolve();
    });
  });

const buildDir = join(projectRoot, ".next");

try {
  if (!existsSync(buildDir)) {
    await runNext(["build"]);
  }
  await runNext(["start"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
