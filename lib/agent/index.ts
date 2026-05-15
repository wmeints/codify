import { readFileSync } from "node:fs";
import path from "node:path";

import { stepCountIs, ToolLoopAgent } from "ai";
import type { InferAgentUIMessage } from "ai";

import {
  grepTool,
  readFileTool,
  writeFileTool,
  editFileTool,
  shellTool,
} from "@/lib/agent/tools";
import { getModel } from "@/lib/llm";

export const tools = {
  editFile: editFileTool,
  grep: grepTool,
  readFile: readFileTool,
  shell: shellTool,
  writeFile: writeFileTool,
} as const;

const loadSystemPrompt = (): string => {
  const promptPath = path.join(process.cwd(), "prompts", "system.md");
  return readFileSync(promptPath, "utf-8");
};

const buildAgent = () =>
  new ToolLoopAgent({
    instructions: loadSystemPrompt(),
    model: getModel(),
    stopWhen: stepCountIs(20),
    tools,
  });

let cachedAgent: ReturnType<typeof buildAgent> | null = null;

export const getAgent = (): ReturnType<typeof buildAgent> => {
  if (!cachedAgent) {
    cachedAgent = buildAgent();
  }
  return cachedAgent;
};

export type CodifyUIMessage = InferAgentUIMessage<
  ReturnType<typeof buildAgent>
>;
