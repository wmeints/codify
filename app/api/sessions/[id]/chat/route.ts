import { createAgentUIStreamResponse } from "ai";

import { getAgent } from "@/lib/agent";
import type { CodifyUIMessage } from "@/lib/agent";
import { saveSessionHistory } from "@/lib/sessions";

interface ChatRequestBody {
  messages: CodifyUIMessage[];
}

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> => {
  const { id } = await params;
  const timestamp = Number.parseInt(id, 10);
  if (!Number.isFinite(timestamp)) {
    return new Response("Invalid session id", { status: 400 });
  }

  const { messages } = (await request.json()) as ChatRequestBody;

  return createAgentUIStreamResponse({
    agent: getAgent(),
    onFinish: async ({ messages: updated }) => {
      await saveSessionHistory(timestamp, updated as CodifyUIMessage[]);
    },
    originalMessages: messages,
    uiMessages: messages,
  });
};
