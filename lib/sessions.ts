import { promises as fs } from "node:fs";
import path from "node:path";

import type { UIMessage } from "ai";

export interface Session {
  timestamp: number;
  title: string;
  createdAt: string;
  modifiedAt: string;
  history: UIMessage[];
}

type StoredSession = Omit<Session, "timestamp">;

const SESSIONS_DIR = path.join(process.cwd(), ".codify", "sessions");

const isMissingFileError = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException)?.code === "ENOENT";

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
    title: "Untitled",
  };

  await fs.mkdir(SESSIONS_DIR, { recursive: true });

  const { timestamp: _omitted, ...stored } = session;
  const filePath = path.join(SESSIONS_DIR, `${timestamp}.json`);
  await fs.writeFile(filePath, JSON.stringify(stored, null, 2), "utf-8");

  return session;
};
