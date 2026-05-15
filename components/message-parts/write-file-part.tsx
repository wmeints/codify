"use client";

import { Pencil } from "lucide-react";

import { LineNumberedView } from "@/components/message-parts/line-numbered-view";
import {
  summarizePath,
  ToolPartFrame,
} from "@/components/message-parts/tool-frame";
import type { AnyToolUIPart } from "@/components/message-parts/tool-frame";

interface WriteFileResult {
  content: string;
  bytesWritten: number | null;
}

const getWriteFileResult = (
  input: unknown,
  output: unknown
): WriteFileResult | null => {
  if (input === null || typeof input !== "object") {
    return null;
  }
  const inputRecord = input as Record<string, unknown>;
  if (typeof inputRecord.content !== "string") {
    return null;
  }
  const outputRecord =
    output !== null && typeof output === "object"
      ? (output as Record<string, unknown>)
      : null;
  return {
    bytesWritten:
      typeof outputRecord?.bytesWritten === "number"
        ? outputRecord.bytesWritten
        : null,
    content: inputRecord.content,
  };
};

const summarizeOutput = (output: unknown): string | null => {
  if (output === null || typeof output !== "object") {
    return null;
  }
  const record = output as Record<string, unknown>;
  return typeof record.bytesWritten === "number"
    ? `${record.bytesWritten} bytes written`
    : null;
};

interface WriteFileMessagePartProps {
  part: AnyToolUIPart;
}

export const WriteFileMessagePart = ({ part }: WriteFileMessagePartProps) => {
  const hasOutput = part.state === "output-available";
  const result = getWriteFileResult(part.input, hasOutput ? part.output : null);
  const outputSummary = hasOutput ? summarizeOutput(part.output) : null;

  return (
    <ToolPartFrame
      icon={Pencil}
      inputSummary={summarizePath(part.input)}
      outputSummary={outputSummary}
      state={part.state}
      toolName="writeFile"
    >
      {result === null ? null : (
        <LineNumberedView
          content={result.content}
          footer={
            result.bytesWritten === null
              ? null
              : `${result.bytesWritten} bytes written`
          }
        />
      )}
    </ToolPartFrame>
  );
};
