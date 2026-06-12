import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, PenSquare } from "lucide-react";
import { SidebarNavContent } from "./SidebarNav";

export function TopHeader() {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const getPageTitle = () => {
    if (location === "/") return "Dashboard";
    if (location === "/create-post") return "Create Post";
    if (location === "/calendar") return "Calendar";
    if (location === "/posts") return "Posts";
    if (location === "/social-inbox") return "Social Inbox";
    if (location === "/connected-accounts") return "Connected Accounts";
    if (location === "/publish-logs") return "Publish Logs";
    if (location === "/comment-logs") return "Comment Logs";
    if (location === "/ai-assistant") return "AI Assistant";
    if (location === "/website-api") return "Website API";
    if (location === "/settings") return "Settings";
    if (location.startsWith("/media-optimizer")) return "Media Optimizer";
    if (location === "/media-library") return "Media Library";
    if (location.startsWith("/kpi")) return "KPI Dashboard";
    return "Command Center";
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[240px] bg-sidebar border-r-sidebar-border">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-14 items-center border-b border-sidebar-border px-4 text-sidebar-foreground font-bold tracking-tight">
            Command Center
          </div>
          <SidebarNavContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="w-full flex justify-between items-center">
        <h1 className="text-xl font-semibold tracking-tight">{getPageTitle()}</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-bold tracking-wider bg-secondary text-secondary-foreground px-2 py-1 rounded border hidden sm:inline-block">API Mock Mode</span>
          <Button size="sm" onClick={() => setLocation("/create-post")} className="hidden sm:flex">
            <PenSquare className="h-4 w-4 mr-2" /> Create Post
          </Button>
          <Button size="icon" variant="default" onClick={() => setLocation("/create-post")} className="sm:hidden h-8 w-8">
            <PenSquare className="h-4 w-4" />
          </Button>
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shadow-sm cursor-pointer ml-1">JS</div>
        </div>
      </div>
    </header>
  );
}
