import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { z } from "zod";

import type { EditFileTool } from "@/lib/agent/tools/edit-file";

interface EditFileOutput {
  path: string;
  replaced: number;
}

let tmpDir: string;
let originalCwd: string;
let editFileTool: EditFileTool;

const executeEdit = async (input: {
  path: string;
  oldText: string;
  newText: string;
}): Promise<EditFileOutput> => {
  const { execute } = editFileTool;
  if (!execute) {
    throw new Error("editFileTool.execute is not defined");
  }
  const result = await execute(input, { messages: [], toolCallId: "test" });
  return result as EditFileOutput;
};

const getInputSchema = () => editFileTool.inputSchema as z.ZodTypeAny;

beforeAll(async () => {
  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "codify-edit-file-"));
  process.chdir(tmpDir);
  const toolModule = await import("@/lib/agent/tools/edit-file");
  ({ editFileTool } = toolModule);
});

afterAll(async () => {
  process.chdir(originalCwd);
  await fs.rm(tmpDir, { force: true, recursive: true });
});

beforeEach(async () => {
  const entries = await fs.readdir(tmpDir);
  for (const entry of entries) {
    await fs.rm(path.join(tmpDir, entry), { force: true, recursive: true });
  }
});

describe("editFileTool", () => {
  describe("execute", () => {
    it("replaces a unique substring and writes the file back", async () => {
      await fs.writeFile(
        path.join(tmpDir, "t.txt"),
        "before middle after",
        "utf-8"
      );

      const result = await executeEdit({
        newText: "MIDDLE",
        oldText: "middle",
        path: "t.txt",
      });

      expect(result).toEqual({ path: "t.txt", replaced: 1 });
      const written = await fs.readFile(path.join(tmpDir, "t.txt"), "utf-8");
      expect(written).toBe("before MIDDLE after");
    });

    it("preserves the surrounding content exactly", async () => {
      const original = "line 1\nline 2 with TARGET inside\nline 3\n";
      await fs.writeFile(path.join(tmpDir, "ctx.txt"), original, "utf-8");

      await executeEdit({
        newText: "REPLACED",
        oldText: "TARGET",
        path: "ctx.txt",
      });

      const written = await fs.readFile(path.join(tmpDir, "ctx.txt"), "utf-8");
      expect(written).toBe("line 1\nline 2 with REPLACED inside\nline 3\n");
    });

    it("replaces at the very start of the file", async () => {
      await fs.writeFile(
        path.join(tmpDir, "start.txt"),
        "START rest of file",
        "utf-8"
      );

      await executeEdit({
        newText: "BEGIN",
        oldText: "START",
        path: "start.txt",
      });

      const written = await fs.readFile(
        path.join(tmpDir, "start.txt"),
        "utf-8"
      );
      expect(written).toBe("BEGIN rest of file");
    });

    it("replaces at the very end of the file", async () => {
      await fs.writeFile(
        path.join(tmpDir, "end.txt"),
        "leading part END",
        "utf-8"
      );

      await executeEdit({
        newText: "FINISH",
        oldText: "END",
        path: "end.txt",
      });

      const written = await fs.readFile(path.join(tmpDir, "end.txt"), "utf-8");
      expect(written).toBe("leading part FINISH");
    });

    it("allows empty newText to delete the substring", async () => {
      await fs.writeFile(
        path.join(tmpDir, "del.txt"),
        "keep [drop] keep",
        "utf-8"
      );

      const result = await executeEdit({
        newText: "",
        oldText: "[drop] ",
        path: "del.txt",
      });

      expect(result.replaced).toBe(1);
      const written = await fs.readFile(path.join(tmpDir, "del.txt"), "utf-8");
      expect(written).toBe("keep keep");
    });

    it("replaces multi-line oldText with multi-line newText", async () => {
      const original = "a\nold-line-1\nold-line-2\nb\n";
      await fs.writeFile(path.join(tmpDir, "ml.txt"), original, "utf-8");

      await executeEdit({
        newText: "new-line-1\nnew-line-2",
        oldText: "old-line-1\nold-line-2",
        path: "ml.txt",
      });

      const written = await fs.readFile(path.join(tmpDir, "ml.txt"), "utf-8");
      expect(written).toBe("a\nnew-line-1\nnew-line-2\nb\n");
    });

    it("handles UTF-8 multi-byte characters in both old and new text", async () => {
      const original = "prefix 世界 suffix";
      await fs.writeFile(path.join(tmpDir, "u.txt"), original, "utf-8");

      await executeEdit({
        newText: "🌍",
        oldText: "世界",
        path: "u.txt",
      });

      const written = await fs.readFile(path.join(tmpDir, "u.txt"), "utf-8");
      expect(written).toBe("prefix 🌍 suffix");
    });

    it("throws when oldText is not found", async () => {
      await fs.writeFile(
        path.join(tmpDir, "missing.txt"),
        "nothing matches here",
        "utf-8"
      );

      await expect(
        executeEdit({
          newText: "x",
          oldText: "absent",
          path: "missing.txt",
        })
      ).rejects.toThrow(/oldText was not found in missing\.txt/u);
    });

    it("throws when oldText occurs more than once", async () => {
      await fs.writeFile(path.join(tmpDir, "dup.txt"), "foo foo foo", "utf-8");

      await expect(
        executeEdit({
          newText: "bar",
          oldText: "foo",
          path: "dup.txt",
        })
      ).rejects.toThrow(/occurs more than once in dup\.txt/u);
    });

    it("does not write the file when the edit fails", async () => {
      const original = "foo foo";
      await fs.writeFile(path.join(tmpDir, "untouched.txt"), original, "utf-8");
      const beforeStat = await fs.stat(path.join(tmpDir, "untouched.txt"));

      await expect(
        executeEdit({
          newText: "bar",
          oldText: "foo",
          path: "untouched.txt",
        })
      ).rejects.toThrow();

      const after = await fs.readFile(
        path.join(tmpDir, "untouched.txt"),
        "utf-8"
      );
      expect(after).toBe(original);
      const afterStat = await fs.stat(path.join(tmpDir, "untouched.txt"));
      expect(afterStat.mtimeMs).toBe(beforeStat.mtimeMs);
    });

    it("throws when the file does not exist", async () => {
      await expect(
        executeEdit({
          newText: "x",
          oldText: "y",
          path: "no-such-file.txt",
        })
      ).rejects.toThrow();
    });

    it("rejects paths that escape the project directory", async () => {
      await expect(
        executeEdit({
          newText: "x",
          oldText: "y",
          path: "../somewhere.txt",
        })
      ).rejects.toThrow(/escapes the project directory/u);
    });

    it("rejects absolute paths", async () => {
      await expect(
        executeEdit({
          newText: "x",
          oldText: "y",
          path: "/etc/hosts",
        })
      ).rejects.toThrow(/escapes the project directory/u);
    });
  });

  describe("inputSchema", () => {
    it("validates a correct input", () => {
      const result = getInputSchema().safeParse({
        newText: "new",
        oldText: "old",
        path: "a.txt",
      });

      expect(result.success).toBe(true);
    });

    it("rejects input without a path", () => {
      const result = getInputSchema().safeParse({
        newText: "new",
        oldText: "old",
      });

      expect(result.success).toBe(false);
    });

    it("rejects input without oldText", () => {
      const result = getInputSchema().safeParse({
        newText: "new",
        path: "a.txt",
      });

      expect(result.success).toBe(false);
    });

    it("rejects input without newText", () => {
      const result = getInputSchema().safeParse({
        oldText: "old",
        path: "a.txt",
      });

      expect(result.success).toBe(false);
    });

    it("rejects input with non-string fields", () => {
      const result = getInputSchema().safeParse({
        newText: 1,
        oldText: 2,
        path: 3,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("metadata", () => {
    it("has a description", () => {
      const { description } = editFileTool;
      expect(description).toBeDefined();
      expect(typeof description).toBe("string");
      expect(description?.length ?? 0).toBeGreaterThan(0);
    });

    it("description mentions surgical edits / single occurrence", () => {
      expect(editFileTool.description).toMatch(/exactly once/iu);
    });

    it("description mentions replace / substring semantics", () => {
      expect(editFileTool.description).toMatch(/substring/iu);
    });
  });
});
