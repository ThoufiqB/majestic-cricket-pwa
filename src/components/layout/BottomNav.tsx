"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useProfile } from "@/components/context/ProfileContext";
import { useScrollDirection } from "@/lib/hooks/useScrollDirection";
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
    href: "/admin/dashboard", 
    label: "Dashboard", 
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
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

export function BottomNav({ variant }: Props) {
  const pathname = usePathname();
  const { isKidProfile } = useProfile();
  const { isHidden } = useScrollDirection({ threshold: 50, mobileOnly: true });
  
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
    <nav className={`fixed bottom-0 left-0 right-0 z-50 bg-card border-t lg:hidden transition-transform duration-300 ${
      isHidden ? "translate-y-full" : "translate-y-0"
    }`}>
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                active 
                  ? "text-[#1e3a5f] bg-[#1e3a5f]/10" 
                  : "text-muted-foreground hover:text-[#2d5a8a] hover:bg-[#2d5a8a]/10"
              )}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
