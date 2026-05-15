"use client";

import { Terminal } from "lucide-react";

import { ToolPartFrame } from "@/components/message-parts/tool-frame";
import type { AnyToolUIPart } from "@/components/message-parts/tool-frame";
import { cn } from "@/lib/utils";

const COMMAND_PREVIEW_LIMIT = 120;

const summarizeCommand = (input: unknown): string => {
  if (input === null || typeof input !== "object") {
    return "";
  }
  const record = input as Record<string, unknown>;
  if (typeof record.command !== "string") {
    return "";
  }
  const oneLine = record.command.replaceAll(/\s+/gu, " ").trim();
  return oneLine.length > COMMAND_PREVIEW_LIMIT
    ? `${oneLine.slice(0, COMMAND_PREVIEW_LIMIT)}…`
    : oneLine;
};

const summarizeExitCode = (output: unknown): string | null => {
  if (output === null || typeof output !== "object") {
    return null;
  }
  const record = output as Record<string, unknown>;
  return typeof record.exitCode === "number" ? `exit ${record.exitCode}` : null;
};

interface ShellResult {
  command: string;
  stdout: string;
  stderr: string;
  killed: boolean;
  signal: string | null;
}

const getShellResult = (
  input: unknown,
  output: unknown
): ShellResult | null => {
  const inputRecord =
    input !== null && typeof input === "object"
      ? (input as Record<string, unknown>)
      : null;
  const outputRecord =
    output !== null && typeof output === "object"
      ? (output as Record<string, unknown>)
      : null;

  let command = "";
  if (typeof outputRecord?.command === "string") {
    ({ command } = outputRecord);
  } else if (typeof inputRecord?.command === "string") {
    ({ command } = inputRecord);
  }
  if (command.length === 0) {
    return null;
  }

  return {
    command,
    killed: outputRecord?.killed === true,
    signal:
      typeof outputRecord?.signal === "string" ? outputRecord.signal : null,
    stderr: typeof outputRecord?.stderr === "string" ? outputRecord.stderr : "",
    stdout: typeof outputRecord?.stdout === "string" ? outputRecord.stdout : "",
  };
};

interface ShellStreamProps {
  label: string;
  text: string;
  tone: "stdout" | "stderr";
}

const ShellStream = ({ label, text, tone }: ShellStreamProps) => (
  <div className="overflow-hidden rounded-md border bg-background">
    <div
      className={cn(
        "border-b px-3 py-1 font-medium text-muted-foreground text-xs",
        tone === "stderr" && "text-destructive"
      )}
    >
      {label}
    </div>
    <pre className="max-h-96 overflow-auto whitespace-pre-wrap wrap-break-word px-3 py-2 font-mono text-xs">
      {text}
    </pre>
  </div>
);

interface ShellOutputViewerProps {
  result: ShellResult;
  hasOutput: boolean;
}

const ShellOutputViewer = ({ result, hasOutput }: ShellOutputViewerProps) => {
  const hasStdout = result.stdout.length > 0;
  const hasStderr = result.stderr.length > 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border bg-background">
        <div className="border-b bg-muted/30 px-3 py-1 font-medium text-muted-foreground text-xs">
          command
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap wrap-break-word px-3 py-2 font-mono text-xs">
          {result.command}
        </pre>
      </div>
      {hasStdout ? (
        <ShellStream label="stdout" text={result.stdout} tone="stdout" />
      ) : null}
      {hasStderr ? (
        <ShellStream label="stderr" text={result.stderr} tone="stderr" />
      ) : null}
      {hasOutput && !(hasStdout || hasStderr) ? (
        <p className="text-muted-foreground text-xs italic">
          {result.killed
            ? `Command was killed${result.signal ? ` (${result.signal})` : ""}.`
            : "Command produced no output."}
        </p>
      ) : null}
    </div>
  );
};

interface ShellMessagePartProps {
  part: AnyToolUIPart;
}

export const ShellMessagePart = ({ part }: ShellMessagePartProps) => {
  const hasOutput = part.state === "output-available";
  const result = getShellResult(part.input, hasOutput ? part.output : null);
  const outputSummary = hasOutput ? summarizeExitCode(part.output) : null;

  return (
    <ToolPartFrame
      icon={Terminal}
      inputSummary={summarizeCommand(part.input)}
      outputSummary={outputSummary}
      state={part.state}
      toolName="shell"
    >
      {result === null ? null : (
        <ShellOutputViewer hasOutput={hasOutput} result={result} />
      )}
    </ToolPartFrame>
  );
};
