import { createAgentUIStreamResponse } from "ai";

import { getAgent } from "@/lib/agent";
import type { CodifyUIMessage } from "@/lib/agent";
import {
  DEFAULT_SESSION_TITLE,
  extractFirstUserPrompt,
  generateSessionTitle,
  getSession,
  saveSessionHistory,
  updateSessionTitle,
} from "@/lib/sessions";

interface ChatRequestBody {
  messages: CodifyUIMessage[];
}

const maybeAssignTitle = async (
  timestamp: number,
  history: CodifyUIMessage[]
): Promise<void> => {
  const session = await getSession(timestamp);
  if (!session || session.title !== DEFAULT_SESSION_TITLE) {
    return;
  }
  const prompt = extractFirstUserPrompt(history);
  if (prompt.length === 0) {
    return;
  }
  const title = await generateSessionTitle(prompt);
  await updateSessionTitle(timestamp, title);
};

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> => {
  const { id } = await params;
  const timestamp = Number.parseInt(id, 10);
  if (!Number.isFinite(timestamp)) {
    return new Response("Invalid session id", { status: 400 });
  }

  const session = await getSession(timestamp);
  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

  const { messages } = (await request.json()) as ChatRequestBody;

  return createAgentUIStreamResponse({
    agent: getAgent({ customInstructions: session.customInstructions }),
    onFinish: async ({ messages: updated }) => {
      const history = updated as CodifyUIMessage[];
      await saveSessionHistory(timestamp, history);
      await maybeAssignTitle(timestamp, history);
    },
    originalMessages: messages,
    uiMessages: messages,
  });
};
