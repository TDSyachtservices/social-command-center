import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, PenSquare, Calendar, FileText, MessageSquare, 
  Link2, ScrollText, MessageCircle, Bot, Globe, Settings,
  Image as ImageIcon, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create-post", label: "Create Post", icon: PenSquare },
  { href: "/media-library", label: "Media Library", icon: ImageIcon },
  { href: "/media-optimizer", label: "Media Optimizer", icon: Layers },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/social-inbox", label: "Social Inbox", icon: MessageSquare },
  { href: "/connected-accounts", label: "Connected Accounts", icon: Link2 },
  { href: "/publish-logs", label: "Publish Logs", icon: ScrollText },
  { href: "/comment-logs", label: "Comment Logs", icon: MessageCircle },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
  { href: "/website-api", label: "Website API", icon: Globe },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarNavContentProps {
  onNavigate?: () => void;
}

export function SidebarNavContent({ onNavigate }: SidebarNavContentProps) {
  const [location] = useLocation();

  return (
    <div className="flex-1 overflow-auto py-2">
      <nav className="grid items-start px-2 text-sm font-medium gap-1">
        {links.map((link) => {
          const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
              )}
              data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <link.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70")} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function SidebarNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-[220px] hidden flex-col bg-sidebar md:flex border-r border-sidebar-border">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6 text-sidebar-foreground font-bold tracking-tight">
        Command Center
      </div>
      <SidebarNavContent />
    </aside>
  );
}
