"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout";
import { signOutSession } from "@/app/auth";
import { ProfileProvider } from "@/components/context/ProfileContext";

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
    <ProfileProvider>
      <AppShell variant="player" onSignOut={handleSignOut}>
        {children}
      </AppShell>
    </ProfileProvider>
  );
}
