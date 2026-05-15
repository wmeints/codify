import { promises as fs } from "node:fs";
import path from "node:path";

import { generateText, isTextUIPart } from "ai";
import type { UIMessage } from "ai";

import { getModel } from "@/lib/llm";

export interface Session {
  timestamp: number;
  title: string;
  createdAt: string;
  modifiedAt: string;
  history: UIMessage[];
  customInstructions?: string;
}

type StoredSession = Omit<Session, "timestamp">;

export const DEFAULT_SESSION_TITLE = "Untitled";

const TITLE_MAX_LENGTH = 80;

const SESSIONS_DIR = path.join(process.cwd(), ".codify", "sessions");
const AGENTS_FILE = "AGENTS.md";

const isMissingFileError = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException)?.code === "ENOENT";

const readAgentsInstructions = async (): Promise<string | undefined> => {
  const filePath = path.join(process.cwd(), AGENTS_FILE);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const trimmed = raw.trim();
    return trimmed.length === 0 ? undefined : raw;
  } catch (error) {
    if (isMissingFileError(error)) {
      return undefined;
    }
    throw error;
  }
};

const readSession = async (timestamp: number): Promise<Session | null> => {
  const filePath = path.join(SESSIONS_DIR, `${timestamp}.json`);

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as StoredSession;
    return { timestamp, ...data };
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
};

export const listSessions = async (limit?: number): Promise<Session[]> => {
  let entries: string[];

  try {
    entries = await fs.readdir(SESSIONS_DIR);
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }
    throw error;
  }

  const timestamps = entries
    .filter((name) => name.endsWith(".json"))
    .map((name) => Number.parseInt(path.basename(name, ".json"), 10))
    .filter((timestamp) => Number.isFinite(timestamp));

  const settled = await Promise.all(timestamps.map(readSession));

  const sessions = settled.filter(
    (session): session is Session => session !== null
  );

  sessions.sort((a, b) => {
    const modifiedDiff = b.modifiedAt.localeCompare(a.modifiedAt);
    if (modifiedDiff !== 0) {
      return modifiedDiff;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  return limit === undefined ? sessions : sessions.slice(0, limit);
};

export const getSession = (timestamp: number): Promise<Session | null> =>
  readSession(timestamp);

export const saveSessionHistory = async (
  timestamp: number,
  history: UIMessage[]
): Promise<void> => {
  const filePath = path.join(SESSIONS_DIR, `${timestamp}.json`);
  const raw = await fs.readFile(filePath, "utf-8");
  const existing = JSON.parse(raw) as StoredSession;

  const updated: StoredSession = {
    ...existing,
    history,
    modifiedAt: new Date().toISOString(),
  };

  await fs.writeFile(filePath, JSON.stringify(updated, null, 2), "utf-8");
};

export const createSession = async (prompt: string): Promise<Session> => {
  const timestamp = Date.now();
  const now = new Date().toISOString();
  const customInstructions = await readAgentsInstructions();

  const session: Session = {
    createdAt: now,
    history: [
      {
        id: crypto.randomUUID(),
        parts: [{ text: prompt, type: "text" }],
        role: "user",
      },
    ],
    modifiedAt: now,
    timestamp,
    title: DEFAULT_SESSION_TITLE,
    ...(customInstructions === undefined ? {} : { customInstructions }),
  };

  await fs.mkdir(SESSIONS_DIR, { recursive: true });

  const { timestamp: _omitted, ...stored } = session;
  const filePath = path.join(SESSIONS_DIR, `${timestamp}.json`);
  await fs.writeFile(filePath, JSON.stringify(stored, null, 2), "utf-8");

  return session;
};

export const extractFirstUserPrompt = (history: UIMessage[]): string => {
  const firstUser = history.find((message) => message.role === "user");
  if (!firstUser) {
    return "";
  }
  return firstUser.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join(" ")
    .trim();
};

export const generateSessionTitle = async (prompt: string): Promise<string> => {
  const { text } = await generateText({
    model: getModel(),
    prompt: `Write a short, descriptive title (max 6 words) for a coding session that begins with the user message below. Respond with the title only — no quotes, no trailing punctuation, no preamble.\n\nUser message:\n${prompt}`,
  });
  const cleaned = text
    .trim()
    .replaceAll(/^["']|["']$/gu, "")
    .trim();
  if (cleaned.length === 0) {
    return DEFAULT_SESSION_TITLE;
  }
  return cleaned.length > TITLE_MAX_LENGTH
    ? cleaned.slice(0, TITLE_MAX_LENGTH)
    : cleaned;
};

export const updateSessionTitle = async (
  timestamp: number,
  title: string
): Promise<void> => {
  const filePath = path.join(SESSIONS_DIR, `${timestamp}.json`);
  const raw = await fs.readFile(filePath, "utf-8");
  const existing = JSON.parse(raw) as StoredSession;

  const updated: StoredSession = {
    ...existing,
    title,
  };

  await fs.writeFile(filePath, JSON.stringify(updated, null, 2), "utf-8");
};
