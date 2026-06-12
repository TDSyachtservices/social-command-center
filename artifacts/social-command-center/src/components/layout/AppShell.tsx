import { ReactNode } from "react";
import { SidebarNav } from "./SidebarNav";
import { TopHeader } from "./TopHeader";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <SidebarNav />
      <div className="flex flex-col sm:gap-4 sm:py-4 md:pl-[220px] w-full">
        <TopHeader />
        <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
