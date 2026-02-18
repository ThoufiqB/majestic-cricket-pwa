"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiGet } from "@/app/client/api";

type KidProfile = {
  kid_id: string;
  name: string;
  age?: number;
};

type LinkedYouth = {
  player_id: string;
  name: string;
  email: string;
  groups: string[];
  yearOfBirth: number | null;
};

type ProfileContextType = {
  playerId: string | null;
  playerName: string | null;
  activeProfileId: string | null;
  isKidProfile: boolean;
  isAdmin: boolean;
  kids: KidProfile[];
  /** Linked youth player accounts (full accounts managed by this parent/guardian) */
  linkedYouth: LinkedYouth[];
  loading: boolean;
  /** Number of pending parent-approval requests waiting for this user */
  requestCount: number;
  setActiveProfileId: (id: string) => void;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType>({
  playerId: null,
  playerName: null,
  activeProfileId: null,
  isKidProfile: false,
  isAdmin: false,
  kids: [],
  linkedYouth: [],
  loading: true,
  requestCount: 0,
  setActiveProfileId: () => {},
  refreshProfile: async () => {},
});

export function useProfile() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [linkedYouth, setLinkedYouth] = useState<LinkedYouth[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestCount, setRequestCount] = useState(0);

  // isKidProfile is true whenever the active profile is not the parent's own account
  // (covers both dependent kids AND linked youth). Consumers that need to distinguish
  // kids vs linked-youth should check the kids/linkedYouth arrays directly.
  const isKidProfile = !!(activeProfileId && playerId && activeProfileId !== playerId);

  async function loadProfile() {
    try {
      const data = await apiGet("/api/me");
      setPlayerId(data.player_id);
      setPlayerName(data.name || null);
      setActiveProfileIdState(data.active_profile_id || data.player_id);
      setKids(data.kids_profiles || []);
      setLinkedYouth(data.linked_youth_profiles || []);
      setIsAdmin(String(data.role || "").toLowerCase() === "admin");
      // Fetch pending request count (for badge)
      try {
        const reqData = await apiGet("/api/me/requests");
        setRequestCount((reqData.incoming || []).length);
      } catch {
        setRequestCount(0);
      }
    } catch (e) {
      // Not logged in
      setPlayerId(null);
      setPlayerName(null);
      setActiveProfileIdState(null);
      setKids([]);
      setLinkedYouth([]);
      setIsAdmin(false);
      setRequestCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();

    // Re-fetch when the tab regains focus so that changes made in another
    // tab (e.g. admin approving a youth in a different window) are reflected
    // without requiring a hard refresh.
    function onFocus() {
      loadProfile();
    }
    // Also re-fetch when this browser tab becomes visible again (tab switch)
    function onVisibility() {
      if (document.visibilityState === "visible") loadProfile();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  function setActiveProfileId(id: string) {
    setActiveProfileIdState(id);
  }

  return (
    <ProfileContext.Provider
      value={{
        playerId,
        playerName,
        activeProfileId,
        isKidProfile,
        isAdmin,
        kids,
        linkedYouth,
        loading,
        requestCount,
        setActiveProfileId,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
