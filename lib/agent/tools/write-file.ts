import { promises as fs } from "node:fs";
import path from "node:path";

import { tool } from "ai";
import { z } from "zod";

import { resolveWithinProject } from "../shared";

export type WriteFileTool = typeof writeFileTool;

export const writeFileTool = tool({
  description:
    "Write text content to a file in the project. Creates parent directories as needed. Overwrites any existing file at the path.",
  execute: async ({ path: target, content }) => {
    const absolute = resolveWithinProject(target);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, content, "utf-8");
    return { bytesWritten: Buffer.byteLength(content, "utf-8"), path: target };
  },
  inputSchema: z.object({
    content: z.string().describe("UTF-8 text content to write"),
    path: z.string().describe("Path to the file, relative to the project root"),
  }),
});
