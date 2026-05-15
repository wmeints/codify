import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SessionDetail } from "@/components/session-detail";
import { getDisplayCwd } from "@/lib/cwd";
import { getSession } from "@/lib/sessions";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> => {
  const { id } = await params;
  const timestamp = Number.parseInt(id, 10);

  if (!Number.isFinite(timestamp)) {
    return { title: "Codify" };
  }

  const session = await getSession(timestamp);

  if (!session) {
    return { title: "Codify" };
  }

  return {
    title: `${session.title} - Codify`,
  };
};

const SessionPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const timestamp = Number.parseInt(id, 10);
  if (!Number.isFinite(timestamp)) {
    notFound();
  }

  const session = await getSession(timestamp);
  if (!session) {
    notFound();
  }

  return <SessionDetail displayCwd={getDisplayCwd()} session={session} />;
};

export default SessionPage;
