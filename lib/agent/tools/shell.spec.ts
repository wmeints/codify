import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { z } from "zod";

import type { ShellTool } from "@/lib/agent/tools/shell";

interface ShellOutput {
  command: string;
  exitCode: number;
  killed?: boolean;
  signal?: string | null;
  stderr: string;
  stdout: string;
}

let tmpDir: string;
let originalCwd: string;
let shellTool: ShellTool;

const executeShell = async (input: {
  command: string;
}): Promise<ShellOutput> => {
  const { execute } = shellTool;
  if (!execute) {
    throw new Error("shellTool.execute is not defined");
  }
  const result = await execute(input, { messages: [], toolCallId: "test" });
  return result as ShellOutput;
};

const getInputSchema = () => shellTool.inputSchema as z.ZodTypeAny;

beforeAll(async () => {
  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "codify-shell-"));
  process.chdir(tmpDir);
  const toolModule = await import("@/lib/agent/tools/shell");
  ({ shellTool } = toolModule);
});

afterAll(async () => {
  process.chdir(originalCwd);
  await fs.rm(tmpDir, { force: true, recursive: true });
});

describe("shellTool", () => {
  describe("execute", () => {
    it("runs a successful command and captures stdout", async () => {
      const result = await executeShell({ command: "echo hello" });

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("hello");
      expect(result.stderr).toBe("");
      expect(result.command).toBe("echo hello");
    });

    it("captures stderr from a successful command", async () => {
      const result = await executeShell({
        command: "sh -c 'echo error-message 1>&2'",
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toMatch(/error-message/u);
    });

    it("returns the non-zero exit code without throwing", async () => {
      const result = await executeShell({ command: "sh -c 'exit 7'" });

      expect(result.exitCode).toBe(7);
      expect(result.killed).toBe(false);
    });

    it("returns a non-zero exit code when the command does not exist", async () => {
      const result = await executeShell({
        command: "definitely-not-a-real-binary-xyz",
      });

      expect(result.exitCode).not.toBe(0);
    });

    it("executes inside the project root (process.cwd())", async () => {
      const result = await executeShell({ command: "pwd" });

      const realCwd = await fs.realpath(process.cwd());
      const reportedCwd = await fs.realpath(result.stdout.trim());
      expect(reportedCwd).toBe(realCwd);
    });

    it("preserves the command string in the result", async () => {
      const command = "echo 'preserved exactly'";

      const result = await executeShell({ command });

      expect(result.command).toBe(command);
    });

    it("captures both stdout and stderr from a single command", async () => {
      const result = await executeShell({
        command: "sh -c 'echo out; echo err 1>&2'",
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/out/u);
      expect(result.stderr).toMatch(/err/u);
    });
  });

  describe("inputSchema", () => {
    it("validates a correct command", () => {
      const result = getInputSchema().safeParse({ command: "ls" });

      expect(result.success).toBe(true);
    });

    it("rejects input without a command", () => {
      const result = getInputSchema().safeParse({});

      expect(result.success).toBe(false);
    });

    it("rejects input with a non-string command", () => {
      const result = getInputSchema().safeParse({ command: 123 });

      expect(result.success).toBe(false);
    });

    it("rejects input with a null command", () => {
      const result = getInputSchema().safeParse({ command: null });

      expect(result.success).toBe(false);
    });
  });

  describe("metadata", () => {
    it("has a description", () => {
      const { description } = shellTool;
      expect(description).toBeDefined();
      expect(typeof description).toBe("string");
      expect(description?.length ?? 0).toBeGreaterThan(0);
    });

    it("description mentions the 30 second timeout", () => {
      expect(shellTool.description).toMatch(/30 seconds?/iu);
    });

    it("description encourages preferring dedicated file tools", () => {
      expect(shellTool.description).toMatch(/file tools/iu);
    });
  });
});
