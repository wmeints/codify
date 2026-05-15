"use client";

import { getToolName, isFileUIPart, isToolUIPart } from "ai";
import { Paperclip } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { EditFileMessagePart } from "@/components/message-parts/edit-file-part";
import { GenericToolMessagePart } from "@/components/message-parts/generic-tool-part";
import { GrepMessagePart } from "@/components/message-parts/grep-part";
import { ReadFileMessagePart } from "@/components/message-parts/read-file-part";
import { ShellMessagePart } from "@/components/message-parts/shell-part";
import type { AnyToolUIPart } from "@/components/message-parts/tool-frame";
import { WriteFileMessagePart } from "@/components/message-parts/write-file-part";
import type { CodifyUIMessage } from "@/lib/agent";

type CodifyMessagePart = CodifyUIMessage["parts"][number];

const renderToolPart = (part: AnyToolUIPart) => {
  const toolName = getToolName(part);
  switch (toolName) {
    case "editFile": {
      return <EditFileMessagePart part={part} />;
    }
    case "readFile": {
      return <ReadFileMessagePart part={part} />;
    }
    case "writeFile": {
      return <WriteFileMessagePart part={part} />;
    }
    case "shell": {
      return <ShellMessagePart part={part} />;
    }
    case "grep": {
      return <GrepMessagePart part={part} />;
    }
    default: {
      return <GenericToolMessagePart part={part} toolName={toolName} />;
    }
  }
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

  if (isFileUIPart(part)) {
    const label = part.filename ?? part.mediaType;
    if (part.mediaType.startsWith("image/")) {
      return (
        // oxlint-disable-next-line no-img-element
        <img
          alt={label}
          className="max-h-64 max-w-full rounded-md border"
          src={part.url}
        />
      );
    }
    return (
      <a
        className="inline-flex max-w-full items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-sm hover:bg-muted"
        download={part.filename}
        href={part.url}
        rel="noopener"
        target="_blank"
      >
        <Paperclip className="size-4 shrink-0" />
        <span className="truncate font-mono">{label}</span>
      </a>
    );
  }

  if (isToolUIPart(part)) {
    return renderToolPart(part);
  }

  return null;
};
