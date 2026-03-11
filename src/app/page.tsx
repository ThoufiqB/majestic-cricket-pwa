"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClubLogo } from "@/components/ClubLogo";
import { apiGet, apiPatch, apiPost } from "@/app/client/api";
import { ProfileSelector } from "@/app/components/ProfileSelector";
import { ResubmitForm } from "@/app/components/ResubmitForm";
import { Loader2 } from "lucide-react";
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

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<PlayerWithKids | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [rejectionData, setRejectionData] = useState<RejectionData | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await apiGet("/api/me");
        if (data?.player_id) {
          router.replace("/home");
          return;
        }
      } catch {
        // Not logged in
      }
    }
    checkAuth().finally(() => {
      setChecking(false);
    });
  }, [router]);

  async function handleSignIn() {
    setSigningIn(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(firebaseAuth, provider);

      const idToken = await cred.user.getIdToken();

      const r = await fetch("/api/auth/sessionLogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
        setSigningIn(false);
        return;
      }

      // Handle different response statuses
      if (!r.ok) {
        // Check for specific status responses
        if (data?.status === "needs_profile") {
          // New user - needs to complete profile first
          router.replace("/complete-profile");
          return;
        }

        if (data?.status === "pending_approval") {
          // Registration request submitted - redirect to pending page
          router.replace("/pending-approval");
          return;
        }

        if (data?.status === "disabled") {
          // Account disabled - redirect to disabled page
          router.replace("/account-disabled");
          return;
        }

        if (data?.status === "removed") {
          // Account removed - show error message
          setError(data?.message || "Your account has been removed. Please contact an admin.");
          setSigningIn(false);
          return;
        }

        // Other errors
        throw new Error(data?.error || data?.message || "Login failed");
      }

      // Ensure profile exists
      await apiPost("/api/me");

      // IMPORTANT FIX:
      // Fetch hydrated profile (kids_profiles as objects)
      const playerWithKids = (await apiGet("/api/me")) as PlayerWithKids;

      if (!playerWithKids || !playerWithKids.player_id) {
        setError("Could not load user profile. Please try again or contact support.");
        setSigningIn(false);
        return;
      }

      // Check if user has kids - show profile selector
      if (Array.isArray(playerWithKids.kids_profiles) && playerWithKids.kids_profiles.length > 0) {
        setUser(playerWithKids);
        setShowProfileSelector(true);
        setSigningIn(false);
      } else {
        router.replace("/home");
      }
    } catch (e: any) {
      console.error("Sign in failed:", e);
      setError(e?.message || "Sign in failed. Please try again.");
      setSigningIn(false);
    }
  }

  async function handleSelectProfile(profileId: string) {
    try {
      await apiPatch(`/api/kids/${profileId}/switch-profile`, {
        active_profile_id: profileId,
      });

      router.replace("/home");
    } catch (e: any) {
      throw new Error(e?.message || "Failed to select profile");
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f]/5 via-background to-[#1e3a5f]/10">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (showProfileSelector && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f]/5 via-background to-[#1e3a5f]/10 p-4">
        <ProfileSelector
          playerId={user.player_id}
          playerName={user.name}
          playerEmail={user.email}
          kids={user.kids_profiles || []}
          onSelect={handleSelectProfile}
        />
      </div>
    );
  }

  if (rejectionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f]/5 via-background to-[#1e3a5f]/10 p-4">
        <div className="w-full max-w-md">
          <ResubmitForm
            rejectionReason={rejectionData.rejection_reason}
            rejectionNotes={rejectionData.rejection_notes}
            previousData={rejectionData.previous_data}
            onBack={() => setRejectionData(null)}
            onSuccess={() => router.replace("/pending-approval")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f]/5 via-background to-[#1e3a5f]/10 p-4">
      <Card className="w-full max-w-sm shadow-lg">
          <CardContent className="pt-8 pb-8 px-6">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="flex flex-col items-center gap-3">
                <ClubLogo size="lg" />
                <div>
                  <h1 className="text-2xl font-bold text-[#1e3a5f]">Welcome to Majestic Foundation</h1>
                  <p className="text-sm text-muted-foreground mt-1">Manage your cricket activities</p>
                </div>
              </div>

              <div className="w-full text-left space-y-2 py-4 border-y">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-green-600">✓</span>
                  <span>Track events & attendance</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-green-600">✓</span>
                  <span>Manage payments</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-green-600">✓</span>
                  <span>Family profiles for juniors</span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md w-full">
                  {error}
                </p>
              )}

              <Button
                onClick={handleSignIn}
                disabled={signingIn}
                className="w-full bg-[#1e3a5f] hover:bg-[#2d5a8a] text-white"
                size="lg"
              >
                {signingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
