import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { z } from "zod";

import type { ReadFileTool } from "@/lib/agent/tools/read-file";

interface ReadFileOutput {
  bytes: number;
  content: string;
  path: string;
  truncated: boolean;
}

let tmpDir: string;
let originalCwd: string;
let readFileTool: ReadFileTool;

const MAX_READ_BYTES = 64 * 1024;

const executeRead = async (input: {
  path: string;
}): Promise<ReadFileOutput> => {
  const { execute } = readFileTool;
  if (!execute) {
    throw new Error("readFileTool.execute is not defined");
  }
  const result = await execute(input, { messages: [], toolCallId: "test" });
  return result as ReadFileOutput;
};

const getInputSchema = () => readFileTool.inputSchema as z.ZodTypeAny;

beforeAll(async () => {
  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "codify-read-file-"));
  process.chdir(tmpDir);
  const toolModule = await import("@/lib/agent/tools/read-file");
  ({ readFileTool } = toolModule);
});

afterAll(async () => {
  process.chdir(originalCwd);
  await fs.rm(tmpDir, { force: true, recursive: true });
});

beforeEach(async () => {
  const files = await fs.readdir(tmpDir);
  for (const file of files) {
    const filePath = path.join(tmpDir, file);
    const stat = await fs.stat(filePath);
    if (stat.isFile()) {
      await fs.unlink(filePath);
    } else if (stat.isDirectory()) {
      await fs.rm(filePath, { recursive: true });
    }
  }
});

describe("readFileTool", () => {
  describe("execute", () => {
    it("reads a simple text file successfully", async () => {
      const content = "Hello, World!";
      await fs.writeFile(path.join(tmpDir, "test.txt"), content, "utf-8");

      const result = await executeRead({ path: "test.txt" });

      expect(result).toEqual({
        bytes: Buffer.byteLength(content),
        content,
        path: "test.txt",
        truncated: false,
      });
    });

    it("reads a file from a subdirectory", async () => {
      const content = "Nested content";
      await fs.mkdir(path.join(tmpDir, "subdir"), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, "subdir", "nested.txt"),
        content,
        "utf-8"
      );

      const result = await executeRead({ path: "subdir/nested.txt" });

      expect(result).toEqual({
        bytes: Buffer.byteLength(content),
        content,
        path: "subdir/nested.txt",
        truncated: false,
      });
    });

    it("reads an empty file successfully", async () => {
      await fs.writeFile(path.join(tmpDir, "empty.txt"), "", "utf-8");

      const result = await executeRead({ path: "empty.txt" });

      expect(result).toEqual({
        bytes: 0,
        content: "",
        path: "empty.txt",
        truncated: false,
      });
    });

    it("reads a file with UTF-8 characters", async () => {
      const content = "Hello 世界 🌍 Привет";
      await fs.writeFile(path.join(tmpDir, "unicode.txt"), content, "utf-8");

      const result = await executeRead({ path: "unicode.txt" });

      expect(result).toEqual({
        bytes: Buffer.byteLength(content),
        content,
        path: "unicode.txt",
        truncated: false,
      });
    });

    it("truncates files larger than 64 KiB", async () => {
      const largeContent = "a".repeat(MAX_READ_BYTES + 100);
      await fs.writeFile(path.join(tmpDir, "large.txt"), largeContent, "utf-8");

      const result = await executeRead({ path: "large.txt" });

      expect(result.bytes).toBe(MAX_READ_BYTES + 100);
      expect(result.content).toBe("a".repeat(MAX_READ_BYTES));
      expect(result.path).toBe("large.txt");
      expect(result.truncated).toBe(true);
      expect(result.content.length).toBe(MAX_READ_BYTES);
    });

    it("does not truncate a file exactly at the limit", async () => {
      const content = "b".repeat(MAX_READ_BYTES);
      await fs.writeFile(path.join(tmpDir, "exact.txt"), content, "utf-8");

      const result = await executeRead({ path: "exact.txt" });

      expect(result).toEqual({
        bytes: MAX_READ_BYTES,
        content,
        path: "exact.txt",
        truncated: false,
      });
    });

    it("truncates a file one byte over the limit", async () => {
      const content = "c".repeat(MAX_READ_BYTES + 1);
      await fs.writeFile(path.join(tmpDir, "over-limit.txt"), content, "utf-8");

      const result = await executeRead({ path: "over-limit.txt" });

      expect(result.bytes).toBe(MAX_READ_BYTES + 1);
      expect(result.content).toBe("c".repeat(MAX_READ_BYTES));
      expect(result.path).toBe("over-limit.txt");
      expect(result.truncated).toBe(true);
    });

    it("throws an error when the file does not exist", async () => {
      await expect(executeRead({ path: "nonexistent.txt" })).rejects.toThrow();
    });

    it("throws an error when trying to read a directory", async () => {
      await fs.mkdir(path.join(tmpDir, "a-directory"), { recursive: true });

      await expect(executeRead({ path: "a-directory" })).rejects.toThrow();
    });

    it("throws an error when trying to escape the project directory", async () => {
      const outsideDir = path.join(os.tmpdir(), "outside-project");
      await fs.mkdir(outsideDir, { recursive: true });
      await fs.writeFile(
        path.join(outsideDir, "secret.txt"),
        "secret",
        "utf-8"
      );

      try {
        await expect(
          executeRead({ path: "../outside-project/secret.txt" })
        ).rejects.toThrow(/escapes the project directory/u);
      } finally {
        await fs.rm(outsideDir, { force: true, recursive: true });
      }
    });

    it("throws an error for absolute paths (leading slash)", async () => {
      const content = "Leading slash test";
      await fs.writeFile(path.join(tmpDir, "leading.txt"), content, "utf-8");

      await expect(executeRead({ path: "/leading.txt" })).rejects.toThrow(
        /escapes the project directory/u
      );
    });

    it("handles paths with ./ prefix", async () => {
      const content = "Dot slash test";
      await fs.writeFile(path.join(tmpDir, "dot.txt"), content, "utf-8");

      const result = await executeRead({ path: "./dot.txt" });

      expect(result).toEqual({
        bytes: Buffer.byteLength(content),
        content,
        path: "./dot.txt",
        truncated: false,
      });
    });

    it("reads files with special characters in the name", async () => {
      const content = "Special chars";
      const filename = "file-with-special_chars.test.txt";
      await fs.writeFile(path.join(tmpDir, filename), content, "utf-8");

      const result = await executeRead({ path: filename });

      expect(result).toEqual({
        bytes: Buffer.byteLength(content),
        content,
        path: filename,
        truncated: false,
      });
    });

    it("reads a binary-looking file as UTF-8", async () => {
      const buffer = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
      await fs.writeFile(path.join(tmpDir, "binary.bin"), buffer);

      const result = await executeRead({ path: "binary.bin" });

      expect(result).toEqual({
        bytes: 5,
        content: "Hello",
        path: "binary.bin",
        truncated: false,
      });
    });
  });

  describe("inputSchema", () => {
    it("validates a correct path", () => {
      const result = getInputSchema().safeParse({
        path: "some/valid/path.txt",
      });

      expect(result.success).toBe(true);
    });

    it("rejects input without a path", () => {
      const result = getInputSchema().safeParse({});

      expect(result.success).toBe(false);
    });

    it("rejects input with non-string path", () => {
      const result = getInputSchema().safeParse({
        path: 123,
      });

      expect(result.success).toBe(false);
    });

    it("rejects input with null path", () => {
      const result = getInputSchema().safeParse({
        path: null,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("metadata", () => {
    it("has a description", () => {
      const { description } = readFileTool;
      expect(description).toBeDefined();
      expect(typeof description).toBe("string");
      expect(description?.length ?? 0).toBeGreaterThan(0);
    });

    it("description mentions truncation behavior", () => {
      expect(readFileTool.description).toMatch(/truncate/iu);
      expect(readFileTool.description).toMatch(/64.*KiB/iu);
    });

    it("description mentions relative paths", () => {
      expect(readFileTool.description).toMatch(/relative.*project root/iu);
    });
  });
});
