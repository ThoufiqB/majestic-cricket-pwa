"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";
import { apiGet, apiPatch } from "@/app/client/api";
import { ProfileSelector } from "@/app/components/ProfileSelector";
import type { PlayerWithKids } from "@/lib/types/kids";

export default function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [err, setErr] = useState("");
  const [user, setUser] = useState<PlayerWithKids | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);

  async function login() {
    setErr("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(firebaseAuth, provider);

      const idToken = await cred.user.getIdToken();

      const r = await fetch("/api/auth/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ important for cookie-based auth standardization
        body: JSON.stringify({ idToken }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Login failed");

      // Fetch user profile
      const userProfile = await apiGet("/api/me");
      const playerWithKids = userProfile as PlayerWithKids;

      // Check if user has kids
      if (playerWithKids.kids_profiles && playerWithKids.kids_profiles.length > 0) {
        // Always show profile selector - never auto-select
        setUser(playerWithKids);
        setShowProfileSelector(true);
      } else {
        // No kids, proceed directly
        onSignedIn();
      }
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    }
  }

  async function handleSelectProfile(profileId: string) {
    try {
      // Always call the switch-profile endpoint to set active_profile_id
      // Works for both parent (player_id) and kid profiles
      await apiPatch(`/api/kids/${profileId}/switch-profile`, {
        active_profile_id: profileId,
      });

      // Proceed to app
      onSignedIn();
    } catch (e: any) {
      throw new Error(e?.message || "Failed to select profile");
    }
  }

  // Show profile selector if kids exist
  if (showProfileSelector && user) {
    return (
      <ProfileSelector
        playerId={user.player_id}
        playerName={user.name}
        playerEmail={user.email}
        kids={user.kids_profiles || []}
        onSelect={handleSelectProfile}
      />
    );
  }

  return (
    <div className="space-y-2">
      <button className="px-4 py-2 rounded-xl border w-full" onClick={login}>
        Sign in with Google
      </button>
      {err && <p className="text-sm text-red-600 whitespace-pre-wrap">{err}</p>}
    </div>
  );
}
