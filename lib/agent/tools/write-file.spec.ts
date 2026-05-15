import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { z } from "zod";

import type { WriteFileTool } from "@/lib/agent/tools/write-file";

interface WriteFileOutput {
  bytesWritten: number;
  path: string;
}

let tmpDir: string;
let originalCwd: string;
let writeFileTool: WriteFileTool;

const executeWrite = async (input: {
  path: string;
  content: string;
}): Promise<WriteFileOutput> => {
  const { execute } = writeFileTool;
  if (!execute) {
    throw new Error("writeFileTool.execute is not defined");
  }
  const result = await execute(input, { messages: [], toolCallId: "test" });
  return result as WriteFileOutput;
};

const getInputSchema = () => writeFileTool.inputSchema as z.ZodTypeAny;

beforeAll(async () => {
  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "codify-write-file-"));
  process.chdir(tmpDir);
  const toolModule = await import("@/lib/agent/tools/write-file");
  ({ writeFileTool } = toolModule);
});

afterAll(async () => {
  process.chdir(originalCwd);
  await fs.rm(tmpDir, { force: true, recursive: true });
});

beforeEach(async () => {
  const entries = await fs.readdir(tmpDir);
  for (const entry of entries) {
    const entryPath = path.join(tmpDir, entry);
    const stat = await fs.stat(entryPath);
    if (stat.isFile()) {
      await fs.unlink(entryPath);
    } else if (stat.isDirectory()) {
      await fs.rm(entryPath, { recursive: true });
    }
  }
});

describe("writeFileTool", () => {
  describe("execute", () => {
    it("writes a simple text file successfully", async () => {
      const content = "Hello, World!";

      const result = await executeWrite({ content, path: "out.txt" });

      expect(result).toEqual({
        bytesWritten: Buffer.byteLength(content, "utf-8"),
        path: "out.txt",
      });
      const written = await fs.readFile(path.join(tmpDir, "out.txt"), "utf-8");
      expect(written).toBe(content);
    });

    it("writes an empty file successfully", async () => {
      const result = await executeWrite({ content: "", path: "empty.txt" });

      expect(result).toEqual({ bytesWritten: 0, path: "empty.txt" });
      const written = await fs.readFile(
        path.join(tmpDir, "empty.txt"),
        "utf-8"
      );
      expect(written).toBe("");
    });

    it("creates parent directories that do not exist", async () => {
      const content = "nested";

      const result = await executeWrite({
        content,
        path: "a/b/c/nested.txt",
      });

      expect(result).toEqual({
        bytesWritten: Buffer.byteLength(content, "utf-8"),
        path: "a/b/c/nested.txt",
      });
      const written = await fs.readFile(
        path.join(tmpDir, "a", "b", "c", "nested.txt"),
        "utf-8"
      );
      expect(written).toBe(content);
    });

    it("overwrites an existing file", async () => {
      await fs.writeFile(
        path.join(tmpDir, "existing.txt"),
        "original",
        "utf-8"
      );

      const replacement = "replacement content";
      const result = await executeWrite({
        content: replacement,
        path: "existing.txt",
      });

      expect(result.bytesWritten).toBe(Buffer.byteLength(replacement, "utf-8"));
      const written = await fs.readFile(
        path.join(tmpDir, "existing.txt"),
        "utf-8"
      );
      expect(written).toBe(replacement);
    });

    it("writes UTF-8 multi-byte content and reports byte length, not char length", async () => {
      const content = "Hello 世界 🌍 Привет";

      const result = await executeWrite({ content, path: "unicode.txt" });

      const expectedBytes = Buffer.byteLength(content, "utf-8");
      expect(result.bytesWritten).toBe(expectedBytes);
      expect(expectedBytes).toBeGreaterThan(content.length);
      const written = await fs.readFile(
        path.join(tmpDir, "unicode.txt"),
        "utf-8"
      );
      expect(written).toBe(content);
    });

    it("handles paths with ./ prefix", async () => {
      const content = "dot-prefixed";

      const result = await executeWrite({ content, path: "./dot.txt" });

      expect(result.path).toBe("./dot.txt");
      const written = await fs.readFile(path.join(tmpDir, "dot.txt"), "utf-8");
      expect(written).toBe(content);
    });

    it("handles special characters in the filename", async () => {
      const content = "special";
      const filename = "file-with_special.chars.txt";

      const result = await executeWrite({ content, path: filename });

      expect(result.path).toBe(filename);
      const written = await fs.readFile(path.join(tmpDir, filename), "utf-8");
      expect(written).toBe(content);
    });

    it("throws an error when trying to escape the project directory", async () => {
      const outsideDir = path.join(os.tmpdir(), "codify-write-escape-target");
      await fs.mkdir(outsideDir, { recursive: true });

      try {
        await expect(
          executeWrite({
            content: "should not be written",
            path: "../codify-write-escape-target/secret.txt",
          })
        ).rejects.toThrow(/escapes the project directory/u);
        const exists = await fs
          .access(path.join(outsideDir, "secret.txt"))
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(false);
      } finally {
        await fs.rm(outsideDir, { force: true, recursive: true });
      }
    });

    it("throws an error for absolute paths (leading slash)", async () => {
      await expect(
        executeWrite({ content: "x", path: "/leading.txt" })
      ).rejects.toThrow(/escapes the project directory/u);
    });
  });

  describe("inputSchema", () => {
    it("validates a correct input", () => {
      const result = getInputSchema().safeParse({
        content: "hello",
        path: "some/path.txt",
      });

      expect(result.success).toBe(true);
    });

    it("rejects input without a path", () => {
      const result = getInputSchema().safeParse({ content: "hello" });

      expect(result.success).toBe(false);
    });

    it("rejects input without content", () => {
      const result = getInputSchema().safeParse({ path: "some/path.txt" });

      expect(result.success).toBe(false);
    });

    it("rejects input with non-string path", () => {
      const result = getInputSchema().safeParse({
        content: "hello",
        path: 123,
      });

      expect(result.success).toBe(false);
    });

    it("rejects input with non-string content", () => {
      const result = getInputSchema().safeParse({
        content: 123,
        path: "some/path.txt",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("metadata", () => {
    it("has a description", () => {
      const { description } = writeFileTool;
      expect(description).toBeDefined();
      expect(typeof description).toBe("string");
      expect(description?.length ?? 0).toBeGreaterThan(0);
    });

    it("description mentions parent directory creation", () => {
      expect(writeFileTool.description).toMatch(/parent director/iu);
    });

    it("description mentions overwriting", () => {
      expect(writeFileTool.description).toMatch(/overwrite/iu);
    });
  });
});
