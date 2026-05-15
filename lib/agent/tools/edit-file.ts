import { promises as fs } from "node:fs";

import { tool } from "ai";
import { z } from "zod";

import { resolveWithinProject } from "../shared";

export type EditFileTool = typeof editFileTool;

export const editFileTool = tool({
  description:
    "Replace an exact substring inside an existing file. The substring must occur exactly once. Use this for surgical edits instead of rewriting the entire file.",
  execute: async ({ path: target, oldText, newText }) => {
    const absolute = resolveWithinProject(target);
    const original = await fs.readFile(absolute, "utf-8");
    const firstIndex = original.indexOf(oldText);
    if (firstIndex === -1) {
      throw new Error(`oldText was not found in ${target}.`);
    }
    if (original.includes(oldText, firstIndex + 1)) {
      throw new Error(
        `oldText occurs more than once in ${target}; provide more context to make it unique.`
      );
    }
    const updated =
      original.slice(0, firstIndex) +
      newText +
      original.slice(firstIndex + oldText.length);
    await fs.writeFile(absolute, updated, "utf-8");
    return { path: target, replaced: 1 };
  },
  inputSchema: z.object({
    newText: z.string().describe("Replacement text"),
    oldText: z.string().describe("Substring that must occur exactly once"),
    path: z.string().describe("Path to the file, relative to the project root"),
  }),
});
