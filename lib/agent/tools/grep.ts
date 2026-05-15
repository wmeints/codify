import { exec } from "node:child_process";
import { promisify } from "node:util";

import { tool } from "ai";
import z from "zod";

import { resolveWithinProject, projectRoot } from "../shared";

const MAX_GREP_MATCHES = 100;

const execAsync = promisify(exec);

export type GrepTool = typeof grepTool;

export const grepTool = tool({
  description:
    "Search for a fixed-string pattern in the project using git grep. Returns up to 100 matches with file path and line number.",
  execute: async ({ pattern, path: target }) => {
    const args = ["grep", "-nF", "--", pattern];
    if (target) {
      args.push(resolveWithinProject(target));
    }
    const command = `git ${args.map((arg) => JSON.stringify(arg)).join(" ")}`;
    try {
      const { stdout } = await execAsync(command, {
        cwd: projectRoot(),
        maxBuffer: 4 * 1024 * 1024,
      });
      const lines = stdout.split("\n").filter((line) => line.length > 0);
      const matches = lines.slice(0, MAX_GREP_MATCHES).map((line) => {
        const firstColon = line.indexOf(":");
        const secondColon = line.indexOf(":", firstColon + 1);
        return {
          file: line.slice(0, firstColon),
          line: Number.parseInt(line.slice(firstColon + 1, secondColon), 10),
          text: line.slice(secondColon + 1),
        };
      });
      return {
        matches,
        pattern,
        totalMatches: lines.length,
        truncated: lines.length > MAX_GREP_MATCHES,
      };
    } catch (error) {
      const err = error as { code?: number; stderr?: string };
      if (err.code === 1) {
        return { matches: [], pattern, totalMatches: 0, truncated: false };
      }
      throw new Error(err.stderr?.trim() || (error as Error).message, {
        cause: error,
      });
    }
  },
  inputSchema: z.object({
    path: z
      .string()
      .optional()
      .describe(
        "Optional path or pathspec to limit the search, relative to the project root"
      ),
    pattern: z.string().describe("Fixed-string pattern to search for"),
  }),
});
