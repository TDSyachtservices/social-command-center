import { ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";
import { TopHeader } from "./TopHeader";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <SidebarNav />
      <div className="flex flex-col flex-1 min-w-0 sm:gap-4 sm:py-4 md:pl-[220px]">
        <TopHeader />
        <main className="flex-1 min-h-0 overflow-hidden p-4 sm:px-6 sm:py-0 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
