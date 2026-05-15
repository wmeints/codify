import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SessionsList } from "./sessions-list";
import { Button } from "./ui/button";
import Link from "next/link";
import { Plug } from "lucide-react";

export const AppSidebar = () => {
  const providerName = "Local";

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <Link href="/">
          <span className="text-xl font-semibold">Codify</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button variant="outline" asChild>
                    <Link href="/sessions/new">New session</Link>
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Sessions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SessionsList />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 text-md text-muted-foreground border-t flex flex-row">
        <Plug /> {providerName}
      </SidebarFooter>
    </Sidebar>
  );
};
