import Link from "next/link";

import { listSessions } from "@/lib/sessions";

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar";

export const SessionsList = async () => {
  const sessions = await listSessions();

  if (sessions.length === 0) {
    return (
      <p className="px-2 text-sm text-muted-foreground">No sessions yet.</p>
    );
  }

  return (
    <SidebarMenu>
      {sessions.map((session) => (
        <SidebarMenuItem key={session.timestamp}>
          <SidebarMenuButton asChild>
            <Link href={`/sessions/${session.timestamp}`}>{session.title}</Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
};
