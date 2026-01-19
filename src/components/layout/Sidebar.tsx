"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClubLogo } from "@/components/ClubLogo";
import { useProfile } from "@/components/context/ProfileContext";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  CreditCard, 
  Settings,
  Home,
  Search,
  TrendingUp
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPaths?: string[];
};

const adminNavItems: NavItem[] = [
  { 
    href: "/admin/events", 
    label: "Create", 
    icon: <Calendar className="h-5 w-5" />,
    matchPaths: ["/admin/events", "/admin/kids-events"],
  },
  { 
    href: "/admin/browse", 
    label: "Browse", 
    icon: <Search className="h-5 w-5" />,
    matchPaths: ["/admin/browse", "/admin/events/", "/admin/kids-events/"],
  },
  { 
    href: "/admin/members", 
    label: "Members", 
    icon: <Users className="h-5 w-5" />,
    matchPaths: ["/admin/members", "/admin/kids"],
  },
  { 
    href: "/admin/payments", 
    label: "Payments", 
    icon: <CreditCard className="h-5 w-5" />,
  },
  { 
    href: "/admin/settings", 
    label: "Settings", 
    icon: <Settings className="h-5 w-5" />,
  },
];

const playerNavItems: NavItem[] = [
  { 
    href: "/home", 
    label: "Home", 
    icon: <Home className="h-5 w-5" />,
  },
  { 
    href: "/browse", 
    label: "Browse", 
    icon: <Search className="h-5 w-5" />,
  },
  { 
    href: "/stats", 
    label: "Stats", 
    icon: <TrendingUp className="h-5 w-5" />,
  },
  { 
    href: "/payments", 
    label: "Payments", 
    icon: <CreditCard className="h-5 w-5" />,
  },
];

// Nav items for kids profile - same as adult now (My Parents moved to header)
const playerNavItemsKid: NavItem[] = [
  { 
    href: "/home", 
    label: "Home", 
    icon: <Home className="h-5 w-5" />,
  },
  { 
    href: "/browse", 
    label: "Browse", 
    icon: <Search className="h-5 w-5" />,
  },
  { 
    href: "/stats", 
    label: "Stats", 
    icon: <TrendingUp className="h-5 w-5" />,
  },
  { 
    href: "/payments", 
    label: "Payments", 
    icon: <CreditCard className="h-5 w-5" />,
  },
];

type Props = {
  variant: "admin" | "player";
};

export function Sidebar({ variant }: Props) {
  const pathname = usePathname();
  const { isKidProfile } = useProfile();
  
  // Select nav items based on variant and profile type
  const navItems = variant === "admin" 
    ? adminNavItems 
    : (isKidProfile ? playerNavItemsKid : playerNavItems);

  const isActive = (item: NavItem) => {
    // For exact href match (like /admin/events but not /admin/events/123)
    if (pathname === item.href) {
      return true;
    }
    // Check matchPaths for pattern matching
    if (item.matchPaths) {
      return item.matchPaths.some(path => {
        // If path ends with /, it's a prefix match for sub-routes (e.g., /admin/events/ matches /admin/events/123)
        if (path.endsWith('/')) {
          return pathname.startsWith(path);
        }
        // Otherwise exact match only
        return pathname === path;
      });
    }
    return false;
  };

  return (
    <aside 
      className="hidden lg:flex flex-col h-screen bg-card border-r w-[240px]"
    >
      {/* Logo Section */}
      <div className="flex items-center h-18 border-b px-5">
        <div className="flex items-center gap-3">
          <ClubLogo size="md" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-[#1e3a5f]">Majestic</span>
            <span className="text-sm font-bold text-[#1e3a5f]">Cricket</span>
            <span className="text-xs text-[#1e3a5f]/70">Club</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                active 
                  ? "bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold" 
                  : "text-muted-foreground hover:text-[#2d5a8a] hover:bg-[#2d5a8a]/10"
              )}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          {variant === "admin" ? "Admin Panel" : "Player Portal"}
        </p>
      </div>
    </aside>
  );
}
