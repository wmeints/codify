"use server";

import type { FileUIPart } from "ai";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSession } from "@/lib/sessions";

export interface CreateSessionState {
  error: string | null;
}

const fileToFileUIPart = async (file: File): Promise<FileUIPart> => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mediaType = file.type || "application/octet-stream";
  return {
    filename: file.name,
    mediaType,
    type: "file",
    url: `data:${mediaType};base64,${buffer.toString("base64")}`,
  };
};

export const createSessionAction = async (
  _prevState: CreateSessionState,
  formData: FormData
): Promise<CreateSessionState> => {
  const raw = formData.get("prompt");
  const prompt = typeof raw === "string" ? raw.trim() : "";

  if (prompt.length === 0) {
    return { error: "Please enter a prompt before submitting." };
  }

  const uploads = formData
    .getAll("attachments")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const attachments = await Promise.all(uploads.map(fileToFileUIPart));

  const session = await createSession(prompt, attachments);
  revalidatePath("/", "layout");
  redirect(`/sessions/${session.timestamp}`);
};
