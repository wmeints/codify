"use server";

import { redirect } from "next/navigation";

import { createSession } from "@/lib/sessions";

export interface CreateSessionState {
  error: string | null;
}

export const createSessionAction = async (
  _prevState: CreateSessionState,
  formData: FormData
): Promise<CreateSessionState> => {
  const raw = formData.get("prompt");
  const prompt = typeof raw === "string" ? raw.trim() : "";

  if (prompt.length === 0) {
    return { error: "Please enter a prompt before submitting." };
  }

  const session = await createSession(prompt);
  redirect(`/sessions/${session.timestamp}`);
};
