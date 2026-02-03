"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout";
import { signOutSession } from "@/app/auth";
import { ProfileProvider } from "@/components/context/ProfileContext";
import { AuthGuard } from "@/components/guards/AuthGuard";
import { Loader2 } from "lucide-react";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOutSession();
      window.location.href = "/";
    } catch (e) {
      console.error("Sign out failed:", e);
      setSigningOut(false);
    }
  }

  return (
    <AuthGuard
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f]/5 via-background to-[#1e3a5f]/10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ProfileProvider>
        <AppShell variant="player" onSignOut={handleSignOut}>
          {children}
        </AppShell>
      </ProfileProvider>
    </AuthGuard>
  );
}
