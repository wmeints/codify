import { promises as fs } from "node:fs";

import { tool } from "ai";
import { z } from "zod";

import { resolveWithinProject } from "../shared";

const MAX_READ_BYTES = 64 * 1024;

export type ReadFileTool = typeof readFileTool;

export const readFileTool = tool({
  description:
    "Read the contents of a file in the project. Paths are relative to the project root. Output is truncated if the file exceeds 64 KiB.",
  execute: async ({ path: target }) => {
    const absolute = resolveWithinProject(target);
    const buffer = await fs.readFile(absolute);
    if (buffer.byteLength > MAX_READ_BYTES) {
      const truncated = buffer.subarray(0, MAX_READ_BYTES).toString("utf-8");
      return {
        bytes: buffer.byteLength,
        content: truncated,
        path: target,
        truncated: true,
      };
    }
    return {
      bytes: buffer.byteLength,
      content: buffer.toString("utf-8"),
      path: target,
      truncated: false,
    };
  },
  inputSchema: z.object({
    path: z.string().describe("Path to the file, relative to the project root"),
  }),
});
