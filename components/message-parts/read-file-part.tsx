"use client";

import { FileText } from "lucide-react";

import { LineNumberedView } from "@/components/message-parts/line-numbered-view";
import {
  summarizePath,
  ToolPartFrame,
} from "@/components/message-parts/tool-frame";
import type { AnyToolUIPart } from "@/components/message-parts/tool-frame";

interface ReadFileResult {
  bytes: number | null;
  content: string;
  truncated: boolean;
}

const getReadFileResult = (output: unknown): ReadFileResult | null => {
  if (output === null || typeof output !== "object") {
    return null;
  }
  const record = output as Record<string, unknown>;
  if (typeof record.content !== "string") {
    return null;
  }
  return {
    bytes: typeof record.bytes === "number" ? record.bytes : null,
    content: record.content,
    truncated: record.truncated === true,
  };
};

const summarizeOutput = (output: unknown): string | null => {
  if (output === null || typeof output !== "object") {
    return null;
  }
  const record = output as Record<string, unknown>;
  if (typeof record.bytes !== "number") {
    return null;
  }
  return `${record.bytes} bytes${record.truncated ? " · truncated" : ""}`;
};

interface ReadFileMessagePartProps {
  part: AnyToolUIPart;
}

export const ReadFileMessagePart = ({ part }: ReadFileMessagePartProps) => {
  const hasOutput = part.state === "output-available";
  const result = hasOutput ? getReadFileResult(part.output) : null;
  const outputSummary = hasOutput ? summarizeOutput(part.output) : null;

  return (
    <ToolPartFrame
      icon={FileText}
      inputSummary={summarizePath(part.input)}
      outputSummary={outputSummary}
      state={part.state}
      toolName="readFile"
    >
      {result === null ? null : (
        <LineNumberedView
          content={result.content}
          footer={
            result.truncated
              ? `Truncated · showing first 64 KiB${result.bytes === null ? "" : ` of ${result.bytes} bytes`}`
              : null
          }
        />
      )}
    </ToolPartFrame>
  );
};
