import { notFound } from "next/navigation";

import { SessionDetail } from "@/components/session-detail";
import { getDisplayCwd } from "@/lib/cwd";
import { getSession } from "@/lib/sessions";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
}
