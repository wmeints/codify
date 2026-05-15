"use client";

import { Fragment } from "react";
import type { ReactNode } from "react";

interface LineNumberedViewProps {
  content: string;
  footer?: ReactNode;
}

export const LineNumberedView = ({
  content,
  footer,
}: LineNumberedViewProps) => {
  const lines = content.split("\n");
  const totalDigits = String(lines.length).length;
  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="max-h-96 overflow-auto">
        <div className="grid min-w-max grid-cols-[auto_minmax(0,1fr)] font-mono text-xs">
          {lines.map((line, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: source lines are positional within a single content blob
            <Fragment key={idx}>
              <div
                className="select-none border-r bg-muted/60 px-2 py-0.5 text-right text-muted-foreground tabular-nums"
                style={{ minWidth: `${totalDigits + 2}ch` }}
              >
                {idx + 1}
              </div>
              <div className="whitespace-pre-wrap wrap-break-word px-3 py-0.5">
                {line}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      {footer ? (
        <div className="border-t bg-muted/30 px-3 py-1 text-muted-foreground text-xs">
          {footer}
        </div>
      ) : null}
    </div>
  );
};
