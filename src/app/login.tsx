"use client";

import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";
import { apiGet, apiPatch, apiPost } from "@/app/client/api";
import { ProfileSelector } from "@/app/components/ProfileSelector";
import { ResubmitForm } from "@/app/components/ResubmitForm";
import type { PlayerWithKids } from "@/lib/types/kids";

type RejectionData = {
  rejection_reason?: string;
  rejection_notes?: string;
  previous_data?: {
    group?: string;
    member_type?: string;
    phone?: string;
  };
};

export default function Login({ onSignedIn }: { onSignedIn: () => void }) {
  const [err, setErr] = useState("");
  const [user, setUser] = useState<PlayerWithKids | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [rejectionData, setRejectionData] = useState<RejectionData | null>(null);

  async function login() {
    setErr("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(firebaseAuth, provider);

      const idToken = await cred.user.getIdToken();

      const r = await fetch("/api/auth/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // cookie-based session
        body: JSON.stringify({ idToken }),
      });

      const data = await r.json().catch(() => ({}));
      
      // Handle rejection with resubmission
      if (data.status === "rejected" && data.can_resubmit) {
        setRejectionData({
          rejection_reason: data.rejection_reason,
          rejection_notes: data.rejection_notes,
          previous_data: data.previous_data,
        });
        return;
      }
      
      if (!r.ok) throw new Error(data?.error || data?.message || "Login failed");

      // Ensure profile exists
      await apiPost("/api/me");

      // IMPORTANT FIX:
      // Fetch hydrated profile (kids_profiles as objects, not IDs)
      const playerWithKids = (await apiGet("/api/me")) as PlayerWithKids;

      if (!playerWithKids || !playerWithKids.player_id) {
        setErr("Could not load user profile. Please try again or contact support.");
        return;
      }

      // Show selector if user has kids
      if (Array.isArray(playerWithKids.kids_profiles) && playerWithKids.kids_profiles.length > 0) {
        setUser(playerWithKids);
        setShowProfileSelector(true);
      } else {
        onSignedIn();
      }
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    }
  }

  async function handleSelectProfile(profileId: string) {
    try {
      await apiPatch(`/api/kids/${profileId}/switch-profile`, {
        active_profile_id: profileId,
      });

      onSignedIn();
    } catch (e: any) {
      throw new Error(e?.message || "Failed to select profile");
    }
  }

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

  if (rejectionData) {
    return (
      <ResubmitForm
        rejectionReason={rejectionData.rejection_reason}
        rejectionNotes={rejectionData.rejection_notes}
        previousData={rejectionData.previous_data}
        onBack={() => setRejectionData(null)}
        onSuccess={onSignedIn}
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
