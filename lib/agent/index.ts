import { readFileSync } from "node:fs";
import path from "node:path";

import { stepCountIs, ToolLoopAgent } from "ai";
import type { InferAgentUIMessage, SystemModelMessage } from "ai";

import {
  editFileTool,
  grepTool,
  readFileTool,
  shellTool,
  writeFileTool,
} from "@/lib/agent/tools";
import { getModel } from "@/lib/llm";

export const tools = {
  editFile: editFileTool,
  grep: grepTool,
  readFile: readFileTool,
  shell: shellTool,
  writeFile: writeFileTool,
} as const;

let cachedBaseInstructions: string | null = null;

const getBaseInstructions = (): string => {
  if (cachedBaseInstructions === null) {
    const promptPath = path.join(process.cwd(), "prompts", "system.md");
    cachedBaseInstructions = readFileSync(promptPath, "utf-8");
  }
  return cachedBaseInstructions;
};

const buildInstructions = (
  customInstructions: string | undefined
): SystemModelMessage[] => {
  const messages: SystemModelMessage[] = [
    { content: getBaseInstructions(), role: "system" },
  ];
  if (customInstructions && customInstructions.trim().length > 0) {
    messages.push({ content: customInstructions, role: "system" });
  }
  return messages;
};

export interface GetAgentOptions {
  customInstructions?: string;
}

const buildAgent = (options: GetAgentOptions = {}) =>
  new ToolLoopAgent({
    instructions: buildInstructions(options.customInstructions),
    model: getModel(),
    stopWhen: stepCountIs(20),
    tools,
  });

export const getAgent = (
  options?: GetAgentOptions
): ReturnType<typeof buildAgent> => buildAgent(options);

export type CodifyUIMessage = InferAgentUIMessage<
  ReturnType<typeof buildAgent>
>;
