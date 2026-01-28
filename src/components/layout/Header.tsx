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
import { useState } from "react";
import { switchProfile } from "@/lib/switchProfile";
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
  const { isAdmin, isKidProfile, kids, playerId, activeProfileId, setActiveProfileId, refreshProfile } = useProfile();

  // Local state for loading indicator on switch
  const [switchingProfileId, setSwitchingProfileId] = useState<string | null>(null);
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

  // Helper to get current user object for switchProfile util
  const me = playerId ? { player_id: playerId } : null;

  // Unified switch handler
  async function handleHeaderSwitchProfile(profileId: string) {
    if (!me) return;
    setSwitchingProfileId(profileId);
    try {
      await switchProfile({
        profileId,
        me,
        setContextProfileId: setActiveProfileId,
        refreshProfile,
      });
    } finally {
      setSwitchingProfileId(null);
    }
  }

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
        <div className="flex-1 flex items-center justify-end gap-2">
          {/* Admin Link (Player variant only, when user is admin) */}
          {variant === "player" && isAdmin && (
            <Button variant="outline" size="sm" asChild className="text-[#1e3a5f] border-[#1e3a5f]/30 hover:bg-[#1e3a5f]/10">
              <Link href="/admin/dashboard">
                <Shield className="h-4 w-4 mr-1" />
                Admin
              </Link>
            </Button>
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
          {/* Profile Switcher (Player only, now context-driven) */}
          {variant === "player" && currentProfile && profiles && profiles.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200">
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
                    onClick={() => {
                      if (profile.id !== currentProfile.id && !switchingProfileId) {
                        handleHeaderSwitchProfile(profile.id);
                      }
                    }}
                    disabled={!!switchingProfileId}
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
                    {switchingProfileId === profile.id && (
                      <span className="ml-2 animate-spin"><svg className="h-4 w-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /></svg></span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Profile Link (Player only) */}
          {variant === "player" && (
            <Button variant="outline" size="icon" asChild className="bg-green-100 text-green-800 border-green-300 hover:bg-green-200">
              <Link href="/profile">
                <UserCircle className="h-5 w-5" />
              </Link>
            </Button>
          )}

          {/* Sign Out (if callback provided) */}
          {onSignOut && (
            <Button variant="outline" size="icon" onClick={onSignOut} className="bg-red-100 text-red-800 border-red-300 hover:bg-red-200">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
