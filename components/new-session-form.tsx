"use client";

import { ArrowRight } from "lucide-react";
import { useActionState } from "react";
import type { KeyboardEvent } from "react";

import { createSessionAction } from "@/app/sessions/new/actions";
import type { CreateSessionState } from "@/app/sessions/new/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialState: CreateSessionState = { error: null };

const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
};

export const NewSessionForm = () => {
  const [state, formAction, pending] = useActionState(
    createSessionAction,
    initialState
  );

  return (
    <form action={formAction} className="flex w-full max-w-2xl flex-col gap-2">
      <div className="relative">
        <Textarea
          aria-label="Prompt"
          className="min-h-32 resize-none pr-14"
          disabled={pending}
          name="prompt"
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build..."
          required
          rows={4}
        />
        <Button
          aria-label="Submit prompt"
          className="absolute right-2 bottom-2"
          disabled={pending}
          size="icon"
          type="submit"
        >
          <ArrowRight />
        </Button>
      </div>
      {state.error ? (
        <p aria-live="polite" className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Press <kbd className="font-mono">⌘</kbd> +{" "}
          <kbd className="font-mono">↵</kbd> to submit
        </p>
      )}
    </form>
  );
};
