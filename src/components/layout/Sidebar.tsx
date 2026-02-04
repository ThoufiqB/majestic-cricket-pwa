"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClubLogo } from "@/components/ClubLogo";
import { useProfile } from "@/components/context/ProfileContext";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  CreditCard,
  Settings,
  Home,
  Search,
  TrendingUp,
  ClipboardList,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  matchPaths?: string[];
  badge?: () => Promise<number>;
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
    matchPaths: ["/admin/members", "/admin/kids", "/admin/members/registrations"],
    badge: async () => {
      try {
        const res = await fetch("/api/admin/registrations?status=pending", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          return data.requests?.length || 0;
        }
      } catch {}
      return 0;
    },
  },
  {
    href: "/admin/payments",
    label: "Payments",
    icon: <CreditCard className="h-5 w-5" />,
  },
  // ✅ NEW: Manage events (desktop/browser visibility)
  {
    href: "/admin/manage-events",
    label: "Manage events",
    icon: <ClipboardList className="h-5 w-5" />,
    matchPaths: ["/admin/manage-events"],
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
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  // Select nav items based on variant and profile type
  const navItems =
    variant === "admin" ? adminNavItems : isKidProfile ? playerNavItemsKid : playerNavItems;

  // Fetch badge counts for admin nav items
  useEffect(() => {
    if (variant === "admin") {
      const fetchBadges = async () => {
        const counts: Record<string, number> = {};
        for (const item of adminNavItems) {
          if (item.badge) {
            counts[item.href] = await item.badge();
          }
        }
        setBadgeCounts(counts);
      };
      
      fetchBadges();
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchBadges, 30000);
      return () => clearInterval(interval);
    }
  }, [variant]);

  const isActive = (item: NavItem) => {
    // Exact match
    if (pathname === item.href) return true;

    // Pattern match
    if (item.matchPaths) {
      return item.matchPaths.some((path) => {
        if (path.endsWith("/")) return pathname.startsWith(path);
        return pathname === path;
      });
    }

    return false;
  };

  return (
    <aside className="hidden lg:flex flex-col h-screen bg-card border-r w-[240px]">
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
          const badgeCount = badgeCounts[item.href] || 0;
          
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
              <span className="font-medium text-sm flex-1">{item.label}</span>
              {badgeCount > 0 && (
                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs px-1.5 py-0">
                  {badgeCount}
                </Badge>
              )}
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
