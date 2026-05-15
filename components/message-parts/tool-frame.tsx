"use client";

import type { getToolName } from "ai";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type AnyToolUIPart = Parameters<typeof getToolName>[0];

export const summarizePath = (input: unknown): string => {
  if (input !== null && typeof input === "object") {
    const record = input as Record<string, unknown>;
    if (typeof record.path === "string") {
      return record.path;
    }
  }
  return "";
};

interface ToolPartFrameProps {
  icon: LucideIcon;
  toolName: string;
  inputSummary: string;
  state: string;
  outputSummary: string | null;
  children?: ReactNode | null;
}

const renderStatusBadge = (state: string, outputSummary: string | null) => {
  if (state === "output-error") {
    return <Badge variant="destructive">error</Badge>;
  }
  if (state === "input-streaming" || state === "input-available") {
    return <Badge variant="secondary">running…</Badge>;
  }
  return <Badge variant="outline">{outputSummary ?? "done"}</Badge>;
};

export const ToolPartFrame = ({
  icon: Icon,
  toolName,
  inputSummary,
  state,
  outputSummary,
  children,
}: ToolPartFrameProps) => {
  const header = (
    <>
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="font-mono font-medium text-sm">{toolName}</span>
        {inputSummary ? (
          <span className="truncate font-mono text-muted-foreground text-xs">
            {inputSummary}
          </span>
        ) : null}
      </span>
      {renderStatusBadge(state, outputSummary)}
    </>
  );

  if (!children) {
    return (
      <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
        {header}
      </div>
    );
  }

  return (
    <Collapsible className="overflow-hidden rounded-md border bg-muted/30">
      <CollapsibleTrigger asChild>
        <button
          className="group/tool flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-muted/50"
          type="button"
        >
          <ChevronRight
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/tool:rotate-90"
          />
          {header}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t bg-background p-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};
