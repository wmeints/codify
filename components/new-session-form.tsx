"use client";

import { ArrowRight, Paperclip, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

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

const syncFileInput = (input: HTMLInputElement, files: File[]) => {
  const transfer = new DataTransfer();
  for (const file of files) {
    transfer.items.add(file);
  }
  input.files = transfer.files;
};

export const NewSessionForm = () => {
  const [state, formAction, pending] = useActionState(
    createSessionAction,
    initialState
  );
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    if (!selected || selected.length === 0) {
      return;
    }
    setAttachments((current) => {
      const next = [...current, ...selected];
      if (fileInputRef.current) {
        syncFileInput(fileInputRef.current, next);
      }
      return next;
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => {
      const next = current.filter((_, i) => i !== index);
      if (fileInputRef.current) {
        syncFileInput(fileInputRef.current, next);
      }
      return next;
    });
  };

  return (
    <form action={formAction} className="flex w-full max-w-2xl flex-col gap-2">
      {attachments.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <li
              className="flex max-w-full items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-sm"
              // biome-ignore lint/suspicious/noArrayIndexKey: attachments have no stable id
              key={`${file.name}-${index}`}
            >
              <Paperclip className="size-3.5 shrink-0" />
              <span className="truncate font-mono">{file.name}</span>
              <button
                aria-label={`Remove ${file.name}`}
                className="text-muted-foreground hover:text-foreground"
                disabled={pending}
                onClick={() => removeAttachment(index)}
                type="button"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative">
        <Textarea
          aria-label="Prompt"
          className="min-h-32 resize-none pr-14 pl-12"
          disabled={pending}
          name="prompt"
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want to build..."
          required
          rows={4}
        />
        <input
          className="sr-only"
          multiple
          name="attachments"
          onChange={handleFilesSelected}
          ref={fileInputRef}
          tabIndex={-1}
          type="file"
        />
        <Button
          aria-label="Attach files"
          className="absolute bottom-2 left-2"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Paperclip />
        </Button>
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
        <p aria-live="polite" className="text-muted-foreground text-xs">
          Press <kbd className="font-mono">⌘</kbd> +{" "}
          <kbd className="font-mono">↵</kbd> to submit
        </p>
      )}
    </form>
  );
};
