"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClubLogo } from "@/components/ClubLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Home, 
  ChevronDown, 
  User,
  Baby,
  LogOut,
  Settings,
  UserCircle,
  Shield,
  Users
} from "lucide-react";
import { useProfile } from "@/components/context/ProfileContext";
import { useScrollDirection } from "@/lib/hooks/useScrollDirection";

type Profile = {
  id: string;
  name: string;
  type: "player" | "kid";
  avatar?: string;
};

type Props = {
  variant: "admin" | "player";
  title?: string;
  subtitle?: string;
  currentProfile?: Profile;
  profiles?: Profile[];
  onProfileSwitch?: (profileId: string) => void;
  onSignOut?: () => void;
};

export function Header({ 
  variant, 
  title,
  subtitle,
  currentProfile,
  profiles = [],
  onProfileSwitch,
  onSignOut
}: Props) {
  const pathname = usePathname();
  const { isAdmin, isKidProfile, kids } = useProfile();
  const { isHidden } = useScrollDirection({ threshold: 50, mobileOnly: true });

  // Auto-detect title from pathname if not provided
  const getPageTitle = () => {
    if (title) return title;
    
    if (variant === "admin") {
      if (pathname.includes("/dashboard")) return "Dashboard";
      if (pathname.includes("/kids-events")) return "Kids Events";
      if (pathname.includes("/events")) return "Events";
      if (pathname.includes("/members") || pathname.includes("/kids")) return "Members";
      if (pathname.includes("/payments")) return "Payments";
      if (pathname.includes("/settings")) return "Settings";
      return "Admin Panel";
    }
    
    if (pathname.includes("/stats")) return "Stats";
    if (pathname.includes("/payments")) return "Payments";
    if (pathname.includes("/my-kids")) return "My Kids";
    if (pathname.includes("/my-parents")) return "My Parents";
    if (pathname.includes("/profile")) return "Profile";
    if (pathname.includes("/browse")) return "Browse";
    return "Home";
  };

  return (
    <header className={`sticky top-0 z-40 bg-card border-b transition-transform duration-300 ${
      isHidden ? "-translate-y-full lg:translate-y-0" : "translate-y-0"
    }`}>
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Logo (mobile only) + Title */}
        <div className="flex items-center gap-3">
          <div className="lg:hidden">
            <ClubLogo size="sm" />
          </div>
          <div>
            <h1 className="font-semibold text-base flex items-center gap-2">
              {getPageTitle()}
              {variant === "admin" && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Admin
                </Badge>
              )}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Admin Link (Player variant only, when user is admin) */}
          {variant === "player" && isAdmin && (
            <Button variant="outline" size="sm" asChild className="text-[#1e3a5f] border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/10">
              <Link href="/admin/dashboard">
                <Shield className="h-4 w-4 mr-1" />
                Admin
              </Link>
            </Button>
          )}

          {/* My Kids / My Parents Link (Player only) */}
          {variant === "player" && (
            isKidProfile ? (
              <Button variant="ghost" size="icon" asChild>
                <Link href="/my-parents">
                  <UserCircle className="h-5 w-5" />
                </Link>
              </Button>
            ) : kids.length > 0 ? (
              <Button variant="ghost" size="icon" asChild className="relative">
                <Link href="/my-kids">
                  <Users className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-medium">
                    {kids.length}
                  </span>
                </Link>
              </Button>
            ) : null
          )}

          {/* Profile Link (Player only) */}
          {variant === "player" && (
            <Button variant="ghost" size="icon" asChild>
              <Link href="/profile">
                <UserCircle className="h-5 w-5" />
              </Link>
            </Button>
          )}

          {/* Profile Switcher (Player only) */}
          {variant === "player" && currentProfile && profiles.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {currentProfile.type === "kid" ? (
                    <Baby className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span className="max-w-[100px] truncate">{currentProfile.name}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {profiles.map((profile) => (
                  <DropdownMenuItem 
                    key={profile.id}
                    onClick={() => onProfileSwitch?.(profile.id)}
                    className="gap-2"
                  >
                    {profile.type === "kid" ? (
                      <Baby className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    <span>{profile.name}</span>
                    {profile.id === currentProfile.id && (
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        Active
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Home Button (Admin only) */}
          {variant === "admin" && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/home">
                <Home className="h-4 w-4 mr-1" />
                Home
              </Link>
            </Button>
          )}

          {/* Sign Out (if callback provided) */}
          {onSignOut && (
            <Button variant="ghost" size="icon" onClick={onSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
