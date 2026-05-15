"use client";

import { Edit3 } from "lucide-react";
import { Fragment } from "react";

import {
  summarizePath,
  ToolPartFrame,
} from "@/components/message-parts/tool-frame";
import type { AnyToolUIPart } from "@/components/message-parts/tool-frame";
import { cn } from "@/lib/utils";

interface DiffRow {
  left: string | null;
  leftNum: number | null;
  right: string | null;
  rightNum: number | null;
  type: "add" | "equal" | "remove";
}

const computeLineDiff = (oldStr: string, newStr: string): DiffRow[] => {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] =
        oldLines[i] === newLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      rows.push({
        left: oldLines[i],
        leftNum: i + 1,
        right: newLines[j],
        rightNum: j + 1,
        type: "equal",
      });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({
        left: oldLines[i],
        leftNum: i + 1,
        right: null,
        rightNum: null,
        type: "remove",
      });
      i += 1;
    } else {
      rows.push({
        left: null,
        leftNum: null,
        right: newLines[j],
        rightNum: j + 1,
        type: "add",
      });
      j += 1;
    }
  }
  while (i < m) {
    rows.push({
      left: oldLines[i],
      leftNum: i + 1,
      right: null,
      rightNum: null,
      type: "remove",
    });
    i += 1;
  }
  while (j < n) {
    rows.push({
      left: null,
      leftNum: null,
      right: newLines[j],
      rightNum: j + 1,
      type: "add",
    });
    j += 1;
  }
  return rows;
};

const numberCellClasses =
  "select-none border-r bg-muted/60 px-2 py-0.5 text-right text-muted-foreground tabular-nums";
const contentCellClasses = "px-3 py-0.5 whitespace-pre-wrap wrap-break-word";

interface EditFileDiffProps {
  oldText: string;
  newText: string;
}

const EditFileDiff = ({ oldText, newText }: EditFileDiffProps) => {
  const rows = computeLineDiff(oldText, newText);

  return (
    <div className="overflow-x-auto rounded-md border bg-background">
      <div className="grid min-w-max grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] font-mono text-xs">
        <div className="border-r border-b bg-muted/60 px-2 py-1" />
        <div className="border-b bg-muted/30 px-3 py-1 font-sans font-medium text-muted-foreground">
          before
        </div>
        <div className="border-r border-b border-l bg-muted/60 px-2 py-1" />
        <div className="border-b bg-muted/30 px-3 py-1 font-sans font-medium text-muted-foreground">
          after
        </div>
        {rows.map((row, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: diff rows are positional within a single input/output pair
          <Fragment key={idx}>
            <div className={numberCellClasses}>{row.leftNum ?? ""}</div>
            <div
              className={cn(
                contentCellClasses,
                row.type === "remove" &&
                  "bg-red-100/70 text-red-950 dark:bg-red-950/40 dark:text-red-100"
              )}
            >
              {row.left ?? ""}
            </div>
            <div className={cn(numberCellClasses, "border-l")}>
              {row.rightNum ?? ""}
            </div>
            <div
              className={cn(
                contentCellClasses,
                row.type === "add" &&
                  "bg-green-100/70 text-green-950 dark:bg-green-950/40 dark:text-green-100"
              )}
            >
              {row.right ?? ""}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
};

const getEditFileTexts = (
  input: unknown
): { oldText: string; newText: string } | null => {
  if (input === null || typeof input !== "object") {
    return null;
  }
  const record = input as Record<string, unknown>;
  const oldText = typeof record.oldText === "string" ? record.oldText : "";
  const newText = typeof record.newText === "string" ? record.newText : "";
  if (oldText.length === 0 && newText.length === 0) {
    return null;
  }
  return { newText, oldText };
};

const summarizeOutput = (output: unknown): string | null => {
  if (output === null || typeof output !== "object") {
    return null;
  }
  const record = output as Record<string, unknown>;
  return typeof record.replaced === "number" ? "done" : null;
};

interface EditFileMessagePartProps {
  part: AnyToolUIPart;
}

export const EditFileMessagePart = ({ part }: EditFileMessagePartProps) => {
  const texts = getEditFileTexts(part.input);
  const outputSummary =
    part.state === "output-available" ? summarizeOutput(part.output) : null;

  return (
    <ToolPartFrame
      icon={Edit3}
      inputSummary={summarizePath(part.input)}
      outputSummary={outputSummary}
      state={part.state}
      toolName="editFile"
    >
      {texts === null ? null : (
        <EditFileDiff newText={texts.newText} oldText={texts.oldText} />
      )}
    </ToolPartFrame>
  );
};
