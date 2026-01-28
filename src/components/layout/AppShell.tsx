"use client";

import { useState } from "react";
import { useProfile } from "@/components/context/ProfileContext";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
import { AdminMoreMenu } from "./AdminMoreMenu";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  name: string;
  type: "player" | "kid";
  avatar?: string;
};

type Props = {
  children: React.ReactNode;
  variant: "admin" | "player";
  title?: string;
  subtitle?: string;
  currentProfile?: Profile;
  profiles?: Profile[];
  onProfileSwitch?: (profileId: string) => void;
  onSignOut?: () => void;
  /** Max width for content area. Default: 600px */
  maxWidth?: string;
  /** Hide the header */
  hideHeader?: boolean;
};

export function AppShell({
  children,
  variant,
  title,
  subtitle,
  onSignOut,
  maxWidth = "600px",
  hideHeader = false,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Get profile context
  const { playerId, playerName, activeProfileId, isKidProfile, kids, setActiveProfileId } = useProfile();

  // Compose currentProfile and profiles for Header
  let currentProfile = undefined;
  let profiles: Profile[] = [];
  if (playerId) {
    if (isKidProfile) {
      const kid = kids.find((k) => k.kid_id === activeProfileId);
      if (kid) {
        currentProfile = { id: kid.kid_id, name: kid.name, type: "kid" };
      }
    } else {
      currentProfile = { id: playerId, name: playerName || "", type: "player" };
    }
    profiles = [
      { id: playerId, name: playerName || "", type: "player" },
      ...kids.map((kid) => ({ id: kid.kid_id, name: kid.name, type: "kid" })),
    ];
  }

  function handleProfileSwitch(profileId: string) {
    setActiveProfileId(profileId);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="flex">
        {/* Sidebar - Desktop only */}
        <Sidebar variant={variant} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          {!hideHeader && (
            <Header
              variant={variant}
              title={title}
              subtitle={subtitle}
              currentProfile={currentProfile}
              profiles={profiles}
              onProfileSwitch={handleProfileSwitch}
              onSignOut={onSignOut}
            />
          )}

          {/* Page Content */}
          <main
            className={cn(
              "flex-1 w-full mx-auto px-4 py-6",
              // Add bottom padding for mobile nav
              "pb-24 lg:pb-6"
            )}
            style={{ maxWidth }}
          >
            {children}
          </main>
        </div>
      </div>

      {/* ✅ Admin More Menu - Mobile only drawer */}
      {variant === "admin" && (
        <AdminMoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
      )}

      {/* Bottom Nav - Mobile only */}
      <BottomNav
        variant={variant}
        onMoreClick={variant === "admin" ? () => setMoreOpen(true) : undefined}
      />
    </div>
  );
}
