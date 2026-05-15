"use client";

import { Search } from "lucide-react";
import { Fragment } from "react";

import { ToolPartFrame } from "@/components/message-parts/tool-frame";
import type { AnyToolUIPart } from "@/components/message-parts/tool-frame";

interface GrepMatch {
  file: string;
  line: number | null;
  text: string;
}

interface GrepResult {
  pattern: string;
  path: string | null;
  matches: GrepMatch[];
  totalMatches: number;
  truncated: boolean;
}

const parseGrepMatch = (raw: unknown): GrepMatch | null => {
  if (raw === null || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.file !== "string" || typeof record.text !== "string") {
    return null;
  }
  return {
    file: record.file,
    line: typeof record.line === "number" ? record.line : null,
    text: record.text,
  };
};

const getGrepResult = (input: unknown, output: unknown): GrepResult | null => {
  const inputRecord =
    input !== null && typeof input === "object"
      ? (input as Record<string, unknown>)
      : null;
  const outputRecord =
    output !== null && typeof output === "object"
      ? (output as Record<string, unknown>)
      : null;

  let pattern = "";
  if (typeof outputRecord?.pattern === "string") {
    ({ pattern } = outputRecord);
  } else if (typeof inputRecord?.pattern === "string") {
    ({ pattern } = inputRecord);
  }
  if (pattern.length === 0) {
    return null;
  }

  const path =
    typeof inputRecord?.path === "string" && inputRecord.path.length > 0
      ? inputRecord.path
      : null;

  const rawMatches = Array.isArray(outputRecord?.matches)
    ? outputRecord.matches
    : [];
  const matches: GrepMatch[] = [];
  for (const raw of rawMatches) {
    const parsed = parseGrepMatch(raw);
    if (parsed !== null) {
      matches.push(parsed);
    }
  }

  return {
    matches,
    path,
    pattern,
    totalMatches:
      typeof outputRecord?.totalMatches === "number"
        ? outputRecord.totalMatches
        : matches.length,
    truncated: outputRecord?.truncated === true,
  };
};

const summarizeInput = (input: unknown): string => {
  if (input === null || typeof input !== "object") {
    return "";
  }
  const record = input as Record<string, unknown>;
  if (typeof record.pattern !== "string") {
    return "";
  }
  return `"${record.pattern}"${record.path ? ` · ${record.path}` : ""}`;
};

const summarizeOutput = (output: unknown): string | null => {
  if (output === null || typeof output !== "object") {
    return null;
  }
  const record = output as Record<string, unknown>;
  if (typeof record.totalMatches !== "number") {
    return null;
  }
  return `${record.totalMatches} match${record.totalMatches === 1 ? "" : "es"}`;
};

interface GrepResultViewerProps {
  result: GrepResult;
  hasOutput: boolean;
}

const GrepResultViewer = ({ result, hasOutput }: GrepResultViewerProps) => (
  <div className="flex flex-col gap-3">
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="border-b bg-muted/30 px-3 py-1 font-medium text-muted-foreground text-xs">
        pattern
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap wrap-break-word px-3 py-2 font-mono text-xs">
        {result.pattern}
      </pre>
      {result.path === null ? null : (
        <>
          <div className="border-t border-b bg-muted/30 px-3 py-1 font-medium text-muted-foreground text-xs">
            path
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap wrap-break-word px-3 py-2 font-mono text-xs">
            {result.path}
          </pre>
        </>
      )}
    </div>
    {hasOutput ? (
      <div className="overflow-hidden rounded-md border bg-background">
        <div className="flex items-baseline justify-between gap-2 border-b bg-muted/30 px-3 py-1">
          <span className="font-medium text-muted-foreground text-xs">
            {result.totalMatches} match
            {result.totalMatches === 1 ? "" : "es"}
          </span>
          {result.truncated ? (
            <span className="text-muted-foreground text-xs italic">
              showing first {result.matches.length}
            </span>
          ) : null}
        </div>
        {result.matches.length > 0 ? (
          <div className="max-h-96 overflow-auto">
            <div className="grid min-w-max grid-cols-[auto_minmax(0,1fr)] font-mono text-xs">
              {result.matches.map((match, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: grep matches are positional within a single search
                <Fragment key={idx}>
                  <div className="select-none border-r bg-muted/60 px-2 py-0.5 text-right text-muted-foreground tabular-nums">
                    {match.file}
                    {match.line === null ? "" : `:${match.line}`}
                  </div>
                  <div className="whitespace-pre-wrap wrap-break-word px-3 py-0.5">
                    {match.text}
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        ) : (
          <p className="px-3 py-2 text-muted-foreground text-xs italic">
            No matches.
          </p>
        )}
      </div>
    ) : null}
  </div>
);

interface GrepMessagePartProps {
  part: AnyToolUIPart;
}

export const GrepMessagePart = ({ part }: GrepMessagePartProps) => {
  const hasOutput = part.state === "output-available";
  const result = getGrepResult(part.input, hasOutput ? part.output : null);
  const outputSummary = hasOutput ? summarizeOutput(part.output) : null;

  return (
    <ToolPartFrame
      icon={Search}
      inputSummary={summarizeInput(part.input)}
      outputSummary={outputSummary}
      state={part.state}
      toolName="grep"
    >
      {result === null ? null : (
        <GrepResultViewer hasOutput={hasOutput} result={result} />
      )}
    </ToolPartFrame>
  );
};
