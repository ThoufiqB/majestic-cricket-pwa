"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiGet } from "@/app/client/api";

type KidProfile = {
  kid_id: string;
  name: string;
  age?: number;
};

type ProfileContextType = {
  playerId: string | null;
  activeProfileId: string | null;
  isKidProfile: boolean;
  isAdmin: boolean;
  kids: KidProfile[];
  loading: boolean;
  setActiveProfileId: (id: string) => void;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType>({
  playerId: null,
  activeProfileId: null,
  isKidProfile: false,
  isAdmin: false,
  kids: [],
  loading: true,
  setActiveProfileId: () => {},
  refreshProfile: async () => {},
});

export function useProfile() {
  return useContext(ProfileContext);
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const isKidProfile = !!(activeProfileId && playerId && activeProfileId !== playerId);

  async function loadProfile() {
    try {
      const data = await apiGet("/api/me");
      setPlayerId(data.player_id);
      setActiveProfileIdState(data.active_profile_id || data.player_id);
      setKids(data.kids_profiles || []);
      setIsAdmin(String(data.role || "").toLowerCase() === "admin");
    } catch (e) {
      // Not logged in
      setPlayerId(null);
      setActiveProfileIdState(null);
      setKids([]);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function setActiveProfileId(id: string) {
    setActiveProfileIdState(id);
  }

  return (
    <ProfileContext.Provider
      value={{
        playerId,
        activeProfileId,
        isKidProfile,
        isAdmin,
        kids,
        loading,
        setActiveProfileId,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}
