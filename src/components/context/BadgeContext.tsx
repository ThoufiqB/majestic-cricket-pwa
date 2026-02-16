"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type BadgeContextType = {
  pendingRegistrations: number;
  refreshBadges: () => Promise<void>;
  loading: boolean;
};

const BadgeContext = createContext<BadgeContextType>({
  pendingRegistrations: 0,
  refreshBadges: async () => {},
  loading: false,
});

export function useBadges() {
  const context = useContext(BadgeContext);
  // Return safe defaults if called outside provider (e.g., player layout)
  if (!context) {
    return {
      pendingRegistrations: 0,
      refreshBadges: async () => {},
      loading: false,
    };
  }
  return context;
}

export function BadgeProvider({ children }: { children: ReactNode }) {
  const [pendingRegistrations, setPendingRegistrations] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(0);

  const refreshBadges = useCallback(async () => {
    // Debounce: don't fetch if we fetched within last 5 seconds
    const now = Date.now();
    if (now - lastFetch < 5000) {
      return;
    }

    setLoading(true);
    setLastFetch(now);

    try {
      const res = await fetch("/api/admin/registrations?status=pending", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setPendingRegistrations(data.requests?.length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch badge counts:", error);
    } finally {
      setLoading(false);
    }
  }, [lastFetch]);

  return (
    <BadgeContext.Provider
      value={{
        pendingRegistrations,
        refreshBadges,
        loading,
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}
