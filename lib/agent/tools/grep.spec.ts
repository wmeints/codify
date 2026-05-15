import { exec } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { z } from "zod";

import type { GrepTool } from "@/lib/agent/tools/grep";

interface GrepMatch {
  file: string;
  line: number;
  text: string;
}

interface GrepOutput {
  matches: GrepMatch[];
  pattern: string;
  totalMatches: number;
  truncated: boolean;
}

const execAsync = promisify(exec);

let tmpDir: string;
let originalCwd: string;
let grepTool: GrepTool;

const executeGrep = async (input: {
  pattern: string;
  path?: string;
}): Promise<GrepOutput> => {
  const { execute } = grepTool;
  if (!execute) {
    throw new Error("grepTool.execute is not defined");
  }
  const result = await execute(input, { messages: [], toolCallId: "test" });
  return result as GrepOutput;
};

const getInputSchema = () => grepTool.inputSchema as z.ZodTypeAny;

const stageAll = async () => {
  await execAsync("git add -A", { cwd: tmpDir });
};

beforeAll(async () => {
  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "codify-grep-"));
  process.chdir(tmpDir);
  await execAsync("git init -q", { cwd: tmpDir });
  await execAsync("git config user.email codify@example.com", { cwd: tmpDir });
  await execAsync("git config user.name codify", { cwd: tmpDir });

  const toolModule = await import("@/lib/agent/tools/grep");
  ({ grepTool } = toolModule);
});

afterAll(async () => {
  process.chdir(originalCwd);
  await fs.rm(tmpDir, { force: true, recursive: true });
});

beforeEach(async () => {
  const entries = await fs.readdir(tmpDir);
  for (const entry of entries) {
    if (entry === ".git") {
      continue;
    }
    await fs.rm(path.join(tmpDir, entry), { force: true, recursive: true });
  }
  await execAsync("git rm -rf --cached --ignore-unmatch . -q", {
    cwd: tmpDir,
  });
});

describe("grepTool", () => {
  describe("execute", () => {
    it("returns matches with file, line, and text fields", async () => {
      await fs.writeFile(
        path.join(tmpDir, "a.txt"),
        "first line\nhello world\nlast line\n",
        "utf-8"
      );
      await stageAll();

      const result = await executeGrep({ pattern: "hello world" });

      expect(result.pattern).toBe("hello world");
      expect(result.totalMatches).toBe(1);
      expect(result.truncated).toBe(false);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]).toEqual({
        file: "a.txt",
        line: 2,
        text: "hello world",
      });
    });

    it("returns multiple matches across multiple files", async () => {
      await fs.writeFile(
        path.join(tmpDir, "one.txt"),
        "needle\nother\nneedle\n",
        "utf-8"
      );
      await fs.writeFile(
        path.join(tmpDir, "two.txt"),
        "skip\nneedle\n",
        "utf-8"
      );
      await stageAll();

      const result = await executeGrep({ pattern: "needle" });

      expect(result.totalMatches).toBe(3);
      expect(result.truncated).toBe(false);
      const sorted = [...result.matches].toSorted((a, b) =>
        `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`)
      );
      expect(sorted).toEqual([
        { file: "one.txt", line: 1, text: "needle" },
        { file: "one.txt", line: 3, text: "needle" },
        { file: "two.txt", line: 2, text: "needle" },
      ]);
    });

    it("returns empty matches when nothing is found", async () => {
      await fs.writeFile(
        path.join(tmpDir, "nothing.txt"),
        "lorem ipsum\n",
        "utf-8"
      );
      await stageAll();

      const result = await executeGrep({ pattern: "absent-token" });

      expect(result).toEqual({
        matches: [],
        pattern: "absent-token",
        totalMatches: 0,
        truncated: false,
      });
    });

    it("treats the pattern as a fixed string (no regex expansion)", async () => {
      await fs.writeFile(
        path.join(tmpDir, "regex.txt"),
        "literal .* here\nanything else\nx.*y\n",
        "utf-8"
      );
      await stageAll();

      const result = await executeGrep({ pattern: ".*" });

      expect(result.totalMatches).toBe(2);
      const files = result.matches.map((match) => match.file);
      expect(files.every((file) => file === "regex.txt")).toBe(true);
    });

    it("truncates results at 100 matches and reports the true total", async () => {
      const lines = Array.from({ length: 105 }, (_, i) => `match-${i}`).join(
        "\n"
      );
      await fs.writeFile(path.join(tmpDir, "many.txt"), `${lines}\n`, "utf-8");
      await stageAll();

      const result = await executeGrep({ pattern: "match-" });

      expect(result.totalMatches).toBe(105);
      expect(result.truncated).toBe(true);
      expect(result.matches).toHaveLength(100);
    });

    it("limits the search to a path when provided", async () => {
      await fs.mkdir(path.join(tmpDir, "src"), { recursive: true });
      await fs.mkdir(path.join(tmpDir, "tests"), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, "src", "a.txt"),
        "marker\n",
        "utf-8"
      );
      await fs.writeFile(
        path.join(tmpDir, "tests", "b.txt"),
        "marker\n",
        "utf-8"
      );
      await stageAll();

      const result = await executeGrep({ path: "src", pattern: "marker" });

      expect(result.totalMatches).toBe(1);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]?.file).toMatch(/^(?:src\/)?a\.txt$/u);
    });

    it("parses line numbers as integers", async () => {
      const content = Array.from({ length: 10 }, () => "filler").join("\n");
      await fs.writeFile(
        path.join(tmpDir, "ln.txt"),
        `${content}\nbingo\n`,
        "utf-8"
      );
      await stageAll();

      const result = await executeGrep({ pattern: "bingo" });

      expect(result.matches[0]?.line).toBe(11);
      expect(typeof result.matches[0]?.line).toBe("number");
    });

    it("preserves the pattern verbatim in the result", async () => {
      await fs.writeFile(
        path.join(tmpDir, "echo.txt"),
        "verbatim pattern\n",
        "utf-8"
      );
      await stageAll();

      const pattern = "verbatim pattern";
      const result = await executeGrep({ pattern });

      expect(result.pattern).toBe(pattern);
    });

    it("rejects path arguments that escape the project directory", async () => {
      await expect(
        executeGrep({ path: "../outside", pattern: "anything" })
      ).rejects.toThrow(/escapes the project directory/u);
    });
  });

  describe("inputSchema", () => {
    it("validates input with only a pattern", () => {
      const result = getInputSchema().safeParse({ pattern: "needle" });

      expect(result.success).toBe(true);
    });

    it("validates input with both pattern and path", () => {
      const result = getInputSchema().safeParse({
        path: "src",
        pattern: "needle",
      });

      expect(result.success).toBe(true);
    });

    it("rejects input without a pattern", () => {
      const result = getInputSchema().safeParse({ path: "src" });

      expect(result.success).toBe(false);
    });

    it("rejects input with a non-string pattern", () => {
      const result = getInputSchema().safeParse({ pattern: 123 });

      expect(result.success).toBe(false);
    });

    it("rejects input with a non-string path", () => {
      const result = getInputSchema().safeParse({
        path: 123,
        pattern: "needle",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("metadata", () => {
    it("has a description", () => {
      const { description } = grepTool;
      expect(description).toBeDefined();
      expect(typeof description).toBe("string");
      expect(description?.length ?? 0).toBeGreaterThan(0);
    });

    it("description mentions git grep", () => {
      expect(grepTool.description).toMatch(/git grep/iu);
    });

    it("description mentions the 100 match limit", () => {
      expect(grepTool.description).toMatch(/100/u);
    });

    it("description mentions fixed-string matching", () => {
      expect(grepTool.description).toMatch(/fixed.string/iu);
    });
  });
});
