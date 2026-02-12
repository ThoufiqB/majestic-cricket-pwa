"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  UserPlus,
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
    label: "Events",
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
    href: "/admin/members/registrations",
    label: "New Registrations",
    icon: <UserPlus className="h-5 w-5" />,
    matchPaths: ["/admin/members/registrations"],
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
    <aside 
      className="hidden lg:flex flex-col h-screen border-r w-[240px] relative"
      style={{
        backgroundImage: 'url(/MenuBG.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Light semi-transparent overlay to let background show through */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1e3a5f]/70 to-[#2d5a8a]/70"></div>
      
      {/* Content with relative positioning to appear above overlay */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Logo Section - Enhanced UI */}
        <div className="flex items-center justify-center h-28 border-b border-white/20 px-5 py-4 bg-gradient-to-r from-white/5 to-white/10">
          <div className="flex flex-col items-center gap-2">
            {/* Logo with rounded border and glow effect - Larger size */}
            <div className="relative">
              <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-lg"></div>
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/50 shadow-2xl">
                <Image
                  src="/MajesticCC-logo.jpeg"
                  alt="Majestic WiTZy"
                  width={64}
                  height={64}
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            {/* App Name with gradient text */}
            <div className="text-center">
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-amber-100 to-white bg-clip-text text-transparent leading-tight tracking-wide">
                Majestic WiTZy
              </h1>
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-white",
                  active
                    ? "bg-white/20 border-2 border-white font-bold"
                    : "hover:text-amber-300 hover:bg-white/20"
                )}
              >
                {item.icon}
                <span className="font-medium text-sm flex-1">{item.label}</span>
                {badgeCount > 0 && (
                  <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-1.5 py-0">
                    {badgeCount}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/20">
          <p className="text-xs text-white/70 text-center">
            {variant === "admin" ? "Admin Panel" : "Player Portal"}
          </p>
        </div>
      </div>
    </aside>
  );
}
