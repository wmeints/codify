"use client";

import { getToolName, isToolUIPart } from "ai";
import { Edit3, FileText, Pencil, Search, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import type { CodifyUIMessage } from "@/lib/agent";

type CodifyMessagePart = CodifyUIMessage["parts"][number];

const toolIconMap: Record<string, LucideIcon> = {
  editFile: Edit3,
  grep: Search,
  readFile: FileText,
  shell: Terminal,
  writeFile: Pencil,
};

const formatToolInputSummary = (input: unknown): string => {
  if (input === null || input === undefined) {
    return "";
  }
  if (typeof input !== "object") {
    return String(input);
  }
  const record = input as Record<string, unknown>;
  if (typeof record.path === "string") {
    return record.path;
  }
  if (typeof record.command === "string") {
    return record.command;
  }
  if (typeof record.pattern === "string") {
    return `"${record.pattern}"${record.path ? ` · ${record.path}` : ""}`;
  }
  return JSON.stringify(record);
};

const formatToolOutputSummary = (
  toolName: string,
  output: unknown
): string | null => {
  if (output === null || output === undefined || typeof output !== "object") {
    return null;
  }
  const record = output as Record<string, unknown>;
  if (toolName === "grep" && typeof record.totalMatches === "number") {
    const matches = record.totalMatches;
    return `${matches} match${matches === 1 ? "" : "es"}`;
  }
  if (toolName === "readFile" && typeof record.bytes === "number") {
    return `${record.bytes} bytes${record.truncated ? " · truncated" : ""}`;
  }
  if (toolName === "writeFile" && typeof record.bytesWritten === "number") {
    return `${record.bytesWritten} bytes written`;
  }
  if (toolName === "editFile" && typeof record.replaced === "number") {
    return "done";
  }
  if (toolName === "shell" && typeof record.exitCode === "number") {
    return `exit ${record.exitCode}`;
  }
  return null;
};

const renderStatusBadge = (state: string, outputSummary: string | null) => {
  if (state === "output-error") {
    return <Badge variant="destructive">error</Badge>;
  }
  if (state === "input-streaming" || state === "input-available") {
    return <Badge variant="secondary">running…</Badge>;
  }
  return <Badge variant="outline">{outputSummary ?? "done"}</Badge>;
};

interface MessagePartProps {
  part: CodifyMessagePart;
}

export const MessagePart = ({ part }: MessagePartProps) => {
  if (part.type === "text") {
    return (
      <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:text-foreground prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
      </div>
    );
  }

  if (isToolUIPart(part)) {
    const toolName = getToolName(part);
    const Icon = toolIconMap[toolName] ?? Terminal;
    const inputSummary = formatToolInputSummary(part.input);
    const outputSummary =
      part.state === "output-available"
        ? formatToolOutputSummary(toolName, part.output)
        : null;
    const statusBadge = renderStatusBadge(part.state, outputSummary);

    return (
      <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="font-mono font-medium text-sm">{toolName}</span>
          {inputSummary ? (
            <span className="truncate font-mono text-muted-foreground text-xs">
              {inputSummary}
            </span>
          ) : null}
        </div>
        {statusBadge}
      </div>
    );
  }

  return null;
};
