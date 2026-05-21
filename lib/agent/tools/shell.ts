import { exec } from "node:child_process";
import { promisify } from "node:util";

import { tool } from "ai";
import z from "zod";

import { projectRoot } from "../shared";

const execAsync = promisify(exec);

const SHELL_TIMEOUT_MS = 30_000;

const NO_EDITOR =
  "sh -c 'echo \"Interactive editor not available in this environment.\" >&2; exit 1'";
const NO_GIT_EDITOR =
  "sh -c 'echo \"Interactive Git commands are not supported in this environment.\" >&2; exit 1'";

const SHELL_ENV = {
  EDITOR: NO_EDITOR,
  GIT_EDITOR: NO_GIT_EDITOR,
  GIT_PAGER: "cat",
  GIT_SEQUENCE_EDITOR: NO_GIT_EDITOR,
  GIT_TERMINAL_PROMPT: "0",
  VISUAL: NO_EDITOR,
} as const;

export type ShellTool = typeof shellTool;

export const shellTool = tool({
  description: "Run a bash shell command in the project root.",
  execute: async ({ command }) => {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectRoot(),
        env: { ...process.env, ...SHELL_ENV },
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
