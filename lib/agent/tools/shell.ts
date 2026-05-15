import { exec } from "node:child_process";
import { promisify } from "node:util";

import { tool } from "ai";
import z from "zod";

import { projectRoot } from "../shared";

const execAsync = promisify(exec);

const SHELL_TIMEOUT_MS = 30_000;

export type ShellTool = typeof shellTool;

export const shellTool = tool({
  description:
    "Run a shell command in the project root. Use sparingly; prefer the dedicated file tools for reading and editing. Times out after 30 seconds.",
  execute: async ({ command }) => {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectRoot(),
        maxBuffer: 4 * 1024 * 1024,
        timeout: SHELL_TIMEOUT_MS,
      });
      return { command, exitCode: 0, stderr, stdout };
    } catch (error) {
      const err = error as {
        code?: number;
        stdout?: string;
        stderr?: string;
        killed?: boolean;
        signal?: string;
        message: string;
      };
      return {
        command,
        exitCode: typeof err.code === "number" ? err.code : 1,
        killed: err.killed === true,
        signal: err.signal,
        stderr: err.stderr ?? err.message,
        stdout: err.stdout ?? "",
      };
    }
  },
  inputSchema: z.object({
    command: z.string().describe("Shell command to execute"),
  }),
});
