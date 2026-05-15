import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type * as SessionsModule from "@/lib/sessions";

let tmpDir: string;
let originalCwd: string;
let sessions: typeof SessionsModule;

const sessionsDir = () => path.join(tmpDir, ".codify", "sessions");

const writeSession = async (
  timestamp: number,
  data: { title: string; createdAt: string; modifiedAt: string }
) => {
  const dir = sessionsDir();
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${timestamp}.json`),
    JSON.stringify({ ...data, history: [] })
  );
};

beforeAll(async () => {
  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "codify-sessions-"));
  process.chdir(tmpDir);
  sessions = await import("@/lib/sessions");
});

afterAll(async () => {
  process.chdir(originalCwd);
  await fs.rm(tmpDir, { force: true, recursive: true });
});

beforeEach(async () => {
  await fs.rm(sessionsDir(), { force: true, recursive: true });
});

describe("listSessions", () => {
  it("returns an empty array when the sessions directory does not exist", async () => {
    await expect(sessions.listSessions()).resolves.toEqual([]);
  });

  it("returns an empty array when the directory has no json files", async () => {
    await fs.mkdir(sessionsDir(), { recursive: true });
    await fs.writeFile(path.join(sessionsDir(), "README.txt"), "ignore me");

    await expect(sessions.listSessions()).resolves.toEqual([]);
  });

  it("sorts sessions by modifiedAt descending, then createdAt descending", async () => {
    await writeSession(1, {
      createdAt: "2026-01-01T00:00:00Z",
      modifiedAt: "2026-01-01T00:00:00Z",
      title: "old",
    });
    await writeSession(2, {
      createdAt: "2026-03-01T00:00:00Z",
      modifiedAt: "2026-05-01T00:00:00Z",
      title: "newest",
    });
    await writeSession(3, {
      createdAt: "2026-04-01T00:00:00Z",
      modifiedAt: "2026-02-01T00:00:00Z",
      title: "tied-modified-newer-created",
    });
    await writeSession(4, {
      createdAt: "2026-01-15T00:00:00Z",
      modifiedAt: "2026-02-01T00:00:00Z",
      title: "tied-modified-older-created",
    });

    const result = await sessions.listSessions();

    expect(result.map((session) => session.title)).toEqual([
      "newest",
      "tied-modified-newer-created",
      "tied-modified-older-created",
      "old",
    ]);
  });

  it("respects the limit argument", async () => {
    await writeSession(1, {
      createdAt: "2026-01-01T00:00:00Z",
      modifiedAt: "2026-01-01T00:00:00Z",
      title: "a",
    });
    await writeSession(2, {
      createdAt: "2026-02-01T00:00:00Z",
      modifiedAt: "2026-02-01T00:00:00Z",
      title: "b",
    });
    await writeSession(3, {
      createdAt: "2026-03-01T00:00:00Z",
      modifiedAt: "2026-03-01T00:00:00Z",
      title: "c",
    });

    const result = await sessions.listSessions(2);

    expect(result).toHaveLength(2);
    expect(result.map((session) => session.title)).toEqual(["c", "b"]);
  });

  it("skips files whose name is not a finite timestamp", async () => {
    await fs.mkdir(sessionsDir(), { recursive: true });
    await fs.writeFile(
      path.join(sessionsDir(), "not-a-number.json"),
      JSON.stringify({
        createdAt: "2026-01-01T00:00:00Z",
        history: [],
        modifiedAt: "2026-01-01T00:00:00Z",
        title: "ignored",
      })
    );
    await writeSession(42, {
      createdAt: "2026-01-01T00:00:00Z",
      modifiedAt: "2026-01-01T00:00:00Z",
      title: "kept",
    });

    const result = await sessions.listSessions();

    expect(result.map((session) => session.title)).toEqual(["kept"]);
  });
});

describe("getSession", () => {
  it("returns null when the session file does not exist", async () => {
    await expect(sessions.getSession(999)).resolves.toBeNull();
  });

  it("returns the stored session with its timestamp", async () => {
    await writeSession(123, {
      createdAt: "2026-01-01T00:00:00Z",
      modifiedAt: "2026-01-02T00:00:00Z",
      title: "hello",
    });

    const session = await sessions.getSession(123);

    expect(session).toEqual({
      createdAt: "2026-01-01T00:00:00Z",
      history: [],
      modifiedAt: "2026-01-02T00:00:00Z",
      timestamp: 123,
      title: "hello",
    });
  });
});

describe("extractFirstUserPrompt", () => {
  it("returns an empty string when there are no user messages", () => {
    expect(
      sessions.extractFirstUserPrompt([
        {
          id: "a",
          parts: [{ text: "hi", type: "text" }],
          role: "assistant",
        },
      ])
    ).toBe("");
  });

  it("concatenates text parts from the first user message only", () => {
    const result = sessions.extractFirstUserPrompt([
      {
        id: "1",
        parts: [
          { text: "Fix the   ", type: "text" },
          { text: "login bug", type: "text" },
        ],
        role: "user",
      },
      {
        id: "2",
        parts: [{ text: "ok", type: "text" }],
        role: "assistant",
      },
      {
        id: "3",
        parts: [{ text: "ignored", type: "text" }],
        role: "user",
      },
    ]);

    expect(result).toBe("Fix the    login bug");
  });

  it("ignores non-text parts on the first user message", () => {
    const result = sessions.extractFirstUserPrompt([
      {
        id: "1",
        parts: [{ type: "step-start" }, { text: "hello", type: "text" }],
        role: "user",
      },
    ]);

    expect(result).toBe("hello");
  });
});

describe("createSession", () => {
  const agentsPath = () => path.join(tmpDir, "AGENTS.md");

  beforeEach(async () => {
    await fs.rm(agentsPath(), { force: true });
  });

  it("stores AGENTS.md content as customInstructions when present", async () => {
    await fs.writeFile(agentsPath(), "# Custom rules\n\nBe careful.");

    const session = await sessions.createSession("hello");

    expect(session.customInstructions).toBe("# Custom rules\n\nBe careful.");

    const reloaded = await sessions.getSession(session.timestamp);
    expect(reloaded?.customInstructions).toBe("# Custom rules\n\nBe careful.");
  });

  it("omits customInstructions when AGENTS.md is missing", async () => {
    const session = await sessions.createSession("hello");

    expect(session.customInstructions).toBeUndefined();

    const reloaded = await sessions.getSession(session.timestamp);
    expect(reloaded?.customInstructions).toBeUndefined();
  });

  it("omits customInstructions when AGENTS.md is blank", async () => {
    await fs.writeFile(agentsPath(), "   \n\n");

    const session = await sessions.createSession("hello");

    expect(session.customInstructions).toBeUndefined();
  });
});

describe("updateSessionTitle", () => {
  it("rewrites only the title field on disk", async () => {
    await writeSession(7, {
      createdAt: "2026-01-01T00:00:00Z",
      modifiedAt: "2026-01-02T00:00:00Z",
      title: sessions.DEFAULT_SESSION_TITLE,
    });

    await sessions.updateSessionTitle(7, "Refactor auth middleware");

    const session = await sessions.getSession(7);
    expect(session).toEqual({
      createdAt: "2026-01-01T00:00:00Z",
      history: [],
      modifiedAt: "2026-01-02T00:00:00Z",
      timestamp: 7,
      title: "Refactor auth middleware",
    });
  });
});
