import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, PenSquare, Calendar, FileText, MessageSquare,
  Link2, ScrollText, MessageCircle, Settings,
  Image as ImageIcon, BarChart2, ChevronDown, Hash, AtSign,
  Instagram, Facebook, LayoutTemplate, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  label: string | null;
  links: NavLink[];
  collapsible?: boolean;
}

const sections: NavSection[] = [
  {
    label: null,
    links: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Content",
    links: [
      { href: "/create-post",       label: "Create Post",       icon: PenSquare  },
      { href: "/media-library",    label: "Media Library",     icon: ImageIcon  },
      { href: "/hashtag-library",  label: "Hashtag Library",   icon: Hash           },
      { href: "/mention-library",  label: "Mention Library",   icon: AtSign         },
      { href: "/templates",        label: "Templates",         icon: LayoutTemplate },
      { href: "/calendar",         label: "Calendar",          icon: Calendar   },
      { href: "/posts",            label: "Posts",             icon: FileText   },
    ],
  },
  {
    label: "KPI",
    links: [
      { href: "/kpi",            label: "KPI Dashboard",      icon: BarChart2 },
      { href: "/kpi/best-time",  label: "Best Time to Post",  icon: Clock     },
    ],
  },
  {
    label: "Engagement",
    links: [
      { href: "/social-inbox",  label: "Social Inbox",  icon: MessageSquare },
      { href: "/instagram",     label: "Instagram",     icon: Instagram     },
      { href: "/facebook",      label: "Facebook",      icon: Facebook      },
    ],
  },
  {
    label: "Manage",
    collapsible: true,
    links: [
      { href: "/connected-accounts", label: "Connected Accounts", icon: Link2         },
      { href: "/publish-logs",       label: "Publish Logs",       icon: ScrollText    },
      { href: "/comment-logs",       label: "Comment Logs",       icon: MessageCircle },
      { href: "/settings",           label: "Settings",           icon: Settings      },
    ],
  },
];

interface SidebarNavContentProps {
  onNavigate?: () => void;
}

export function SidebarNavContent({ onNavigate }: SidebarNavContentProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isActive = (href: string) => {
    const path = href.split("?")[0];
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const toggleSection = (label: string) =>
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="flex-1 overflow-auto py-2">
      <nav className="px-2 text-sm font-medium space-y-1">
        {sections.map((section, si) => {
          const isCollapsible = Boolean(section.collapsible && section.label);
          const isCollapsed = isCollapsible ? Boolean(collapsed[section.label as string]) : false;
          return (
            <div key={si} className={si > 0 ? "pt-3" : ""}>
              {section.label &&
                (isCollapsible ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.label as string)}
                    aria-expanded={!isCollapsed}
                    className="w-full flex items-center justify-between px-3 pb-1 pt-1 group"
                    data-testid={`nav-section-toggle-${section.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/50 select-none group-hover:text-sidebar-foreground/80 transition-colors">
                      {section.label}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-sidebar-foreground/40 transition-transform group-hover:text-sidebar-foreground/70",
                        isCollapsed ? "-rotate-90" : "rotate-0"
                      )}
                    />
                  </button>
                ) : (
                  <div className="px-3 pb-1 pt-1">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-sidebar-foreground/50 select-none">
                      {section.label}
                    </span>
                  </div>
                ))}
              {!isCollapsed && (
                <div className="space-y-0.5">
                  {section.links.map((link) => {
                    const active = isActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          active ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                        )}
                        data-testid={`nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <link.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                          )}
                        />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
