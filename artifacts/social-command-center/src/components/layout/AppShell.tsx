import { ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";
import { TopHeader } from "./TopHeader";
import { InboxSyncProvider } from "@/hooks/use-inbox-sync";
import { useScheduledPostReminders } from "@/hooks/use-scheduled-post-reminders";

interface AppShellProps {
  children: ReactNode;
}

function AppShellInner({ children }: AppShellProps) {
  useScheduledPostReminders();
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <SidebarNav />
      <div className="flex flex-col flex-1 min-w-0 sm:gap-4 sm:py-4 md:pl-[220px]">
        <TopHeader />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:px-6 sm:py-0 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  return (
    <InboxSyncProvider>
      <AppShellInner>{children}</AppShellInner>
    </InboxSyncProvider>
  );
}
