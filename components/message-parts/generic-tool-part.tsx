"use client";

import { Terminal } from "lucide-react";

import { ToolPartFrame } from "@/components/message-parts/tool-frame";
import type { AnyToolUIPart } from "@/components/message-parts/tool-frame";

const summarizeInput = (input: unknown): string => {
  if (input === null || input === undefined) {
    return "";
  }
  if (typeof input !== "object") {
    return String(input);
  }
  return JSON.stringify(input);
};

interface GenericToolMessagePartProps {
  toolName: string;
  part: AnyToolUIPart;
}

export const GenericToolMessagePart = ({
  toolName,
  part,
}: GenericToolMessagePartProps) => (
  <ToolPartFrame
    icon={Terminal}
    inputSummary={summarizeInput(part.input)}
    outputSummary={null}
    state={part.state}
    toolName={toolName}
  />
);
