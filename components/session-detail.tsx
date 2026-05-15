"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { ArrowRight, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";

import { MessagePart } from "@/components/message-part";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CodifyUIMessage } from "@/lib/agent";
import type { Session } from "@/lib/sessions";
import { cn } from "@/lib/utils";

interface SessionDetailProps {
  session: Session;
  displayCwd: string;
}

const formatTime = (iso: string | undefined): string => {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const messageTime = (message: UIMessage): string => {
  const metadata = message.metadata as
    | { createdAt?: string; timestamp?: string }
    | undefined;
  return formatTime(metadata?.createdAt ?? metadata?.timestamp);
};

const isUnansweredFirstUser = (history: UIMessage[]): boolean =>
  history.length === 1 && history[0]?.role === "user";

const handleSubmitKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
};

interface MessageRowProps {
  message: CodifyUIMessage;
}

const MessageRow = ({ message }: MessageRowProps) => {
  const isUser = message.role === "user";
  const label = isUser ? "you" : "agent";
  const time = messageTime(message);

  return (
    <article className="flex items-start gap-3">
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-2 rounded-md border px-4 py-3",
          isUser ? "bg-sky-50/50" : "bg-background"
        )}
      >
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm">{label}</span>
          {time ? (
            <span className="font-mono text-muted-foreground text-xs">
              {time}
            </span>
          ) : null}
        </div>
        {message.parts.map((part, index) => (
          <MessagePart
            // biome-ignore lint/suspicious/noArrayIndexKey: parts are positional within a single message
            key={index}
            part={part}
          />
        ))}
      </div>
    </article>
  );
};

export const SessionDetail = ({ session, displayCwd }: SessionDetailProps) => {
  const initialMessages = session.history as CodifyUIMessage[];

  const { messages, sendMessage, regenerate, status, stop, error } =
    useChat<CodifyUIMessage>({
      id: String(session.timestamp),
      messages: initialMessages,
      transport: new DefaultChatTransport({
        api: `/api/sessions/${session.timestamp}/chat`,
      }),
    });

  const router = useRouter();
  const [input, setInput] = useState("");
  const autoSentRef = useRef(false);
  const previousStatusRef = useRef(status);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (autoSentRef.current) {
      return;
    }
    if (status !== "ready") {
      return;
    }
    if (!isUnansweredFirstUser(initialMessages)) {
      return;
    }
    autoSentRef.current = true;
    void regenerate();
  }, [status, initialMessages, regenerate]);

  useEffect(() => {
    const wasActive =
      previousStatusRef.current === "streaming" ||
      previousStatusRef.current === "submitted";
    if (wasActive && status === "ready") {
      router.refresh();
    }
    previousStatusRef.current = status;
  }, [status, router]);

  useLayoutEffect(() => {
    scrollEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (trimmed.length === 0 || status !== "ready") {
      return;
    }
    setInput("");
    void sendMessage({ text: trimmed });
  };

  const isStreaming = status === "submitted" || status === "streaming";
  const composerDisabled = status !== "ready";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-baseline gap-3 border-b px-6 py-4">
        <span className="font-semibold text-lg">{session.title}</span>
        <span className="font-mono text-muted-foreground text-sm">
          {displayCwd}
        </span>
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto"
        data-slot="session-transcript"
      >
        <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-6 py-6">
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
          {error ? (
            <p
              aria-live="polite"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm"
              role="alert"
            >
              {error.message}
            </p>
          ) : null}
          <div ref={scrollEndRef} />
        </div>
      </div>

      <form
        className="shrink-0 bg-background px-6 py-4"
        onSubmit={handleSubmit}
      >
        <div className="relative mx-auto w-full max-w-3xl">
          <Textarea
            aria-label="Prompt"
            className="min-h-24 resize-none pr-14"
            disabled={composerDisabled}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleSubmitKeyDown}
            placeholder="Send a message to the agent..."
            rows={3}
            value={input}
          />
          {isStreaming ? (
            <Button
              aria-label="Stop generation"
              className="absolute right-2 bottom-2"
              onClick={() => stop()}
              size="icon"
              type="button"
              variant="secondary"
            >
              <Square />
            </Button>
          ) : (
            <Button
              aria-label="Submit prompt"
              className="absolute right-2 bottom-2"
              disabled={composerDisabled || input.trim().length === 0}
              size="icon"
              type="submit"
            >
              <ArrowRight />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
