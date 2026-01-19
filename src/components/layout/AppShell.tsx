"use client";

import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { Header } from "./Header";
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
  currentProfile,
  profiles,
  onProfileSwitch,
  onSignOut,
  maxWidth = "600px",
  hideHeader = false,
}: Props) {
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
              onProfileSwitch={onProfileSwitch}
              onSignOut={onSignOut}
            />
          )}

          {/* Page Content */}
          <main className={cn(
            "flex-1 w-full mx-auto px-4 py-6",
            // Add bottom padding for mobile nav
            "pb-24 lg:pb-6"
          )} style={{ maxWidth }}>
            {children}
          </main>
        </div>
      </div>

      {/* Bottom Nav - Mobile only */}
      <BottomNav variant={variant} />
    </div>
  );
}
