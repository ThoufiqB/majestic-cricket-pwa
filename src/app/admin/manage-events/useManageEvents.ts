"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/app/client/api";

/**
 * useManageEvents – Admin Manage Events hook
 *
 * Phase 3:
 * - Adds Month + Group + Event + Name filtering (derived client-side)
 * - Loads member lists (players + kids) so admin never sees IDs in UI
 * - Keeps ALL existing functionality (add/approve/reject) unchanged
 */

type AdminEvent = {
  event_id: string;
  title?: string;
  starts_at?: any;
  group?: string;
  kids_event?: boolean;
  event_type?: string;
};

type Player = {
  player_id: string;
  name: string;
  group?: "men" | "women" | string;
  email?: string;
};

type Kid = {
  kid_id: string;
  name: string;
  parent_id?: string;
};

type ParticipationRequest = {
  id: string;
  event_id: string;
  subject_id: string;
  subject_name: string;
  type: "adult" | "kid";
  requested_by: string;
  requested_at?: any;
  status?: string;
};

export type ManageGroupFilter = "all" | "men" | "women" | "kids";

function toDate(v: any): Date | null {
  try {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
    if (typeof v === "string" || typeof v === "number") {
      const d = new Date(v);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    if (typeof v?.seconds === "number") {
      const d = new Date(v.seconds * 1000);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    return null;
  } catch {
    return null;
  }
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // YYYY-MM
}

function monthLabelFromKey(key: string) {
  const [y, m] = key.split("-");
  const mm = Number(m);
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const name = months[(mm || 1) - 1] || "UNK";
  return `${name} ${y}`;
}

function addMonths(base: Date, delta: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function deriveEventGroup(ev: AdminEvent): ManageGroupFilter {
  const g = String(ev.group || "").toLowerCase();

  // kids events commonly have kids_event=true and group=all_kids
  if (ev.kids_event === true) return "kids";
  if (g === "all_kids" || g === "kids") return "kids";

  if (g === "men") return "men";
  if (g === "women") return "women";

  // "all" or anything else → treat as "all" bucket
  return "all";
}


export function useManageEvents() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [requests, setRequests] = useState<ParticipationRequest[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState<string>("");

  // ======= Month options: previous/current/next only =======
  const monthOptions = useMemo(() => {
    const now = new Date();
    const prev = monthKey(addMonths(now, -1));
    const cur = monthKey(now);
    const next = monthKey(addMonths(now, +1));
    return [
      { key: prev, label: monthLabelFromKey(prev) },
      { key: cur, label: monthLabelFromKey(cur) },
      { key: next, label: monthLabelFromKey(next) },
    ];
  }, []);

  // New: load events by group and month
  const loadEvents = useCallback(async (group: string, month: string) => {
    try {
      setLoadingEvents(true);
      setError("");
      // Use /api/admin/events?month=YYYY-MM&group=men|women|kids|all
      const params = new URLSearchParams();
      if (month) params.append("month", month);
      if (group) params.append("group", group);
      const url = `/api/admin/events?${params.toString()}`;
      const data = await apiGet(url);
      setEvents((data?.events || []) as AdminEvent[]);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // Only loads requests, does not fetch missing events
  const loadRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      setError("");
      const data = await apiGet("/api/admin/participation-requests");
      const reqs = (data?.requests || []) as ParticipationRequest[];
      setRequests(reqs);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // After requests are loaded, fetch missing events only once
  useEffect(() => {
    if (!requests.length) return;
    const loadedEventIds = new Set(events.map(ev => ev.event_id));
    const missingEventIds = Array.from(new Set(requests.map(r => r.event_id))).filter(id => !loadedEventIds.has(id));
    if (missingEventIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const fetched = await Promise.all(
        missingEventIds.map(async (id) => {
          try {
            const ev = await apiGet(`/api/admin/events/${id}`);
            return { event_id: id, ...ev };
          } catch {
            return null;
          }
        })
      );
      if (!cancelled) {
        setEvents(prev => [
          ...prev,
          ...fetched.filter(Boolean).filter(ev => !prev.some(e => e.event_id === ev.event_id)),
        ]);
      }
    })();
    return () => { cancelled = true; };
  }, [requests, events]);

  /**
   * Load members list (players + kids) so Admin picks by NAME not ID.
   *
   * We try a couple of likely endpoints safely.
   * - players: /api/admin/members OR /api/admin/players
   * - kids:    /api/admin/kids/list  (seen in your console logs)
   */
  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    setError("");

    // players
    try {
      const data = await apiGet("/api/admin/members/list");
      const list = (data?.members || data?.items || data || []) as any[];
      const normalized: Player[] = (Array.isArray(list) ? list : []).map((p: any) => ({
        player_id: String(p.player_id || p.id || p.uid || ""),
        name: String(p.name || p.full_name || p.display_name || p.email || "Unknown"),
        group: (String(p.group || "").toLowerCase() as any) || undefined,
        email: p.email ? String(p.email) : undefined,
      })).filter((p) => p.player_id);
      setPlayers(normalized);
    } catch (e: any) {
      console.warn("Failed to load players list:", e);
      setPlayers([]);
    }

    // kids
    try {
      const data = await apiGet("/api/admin/kids/list");
      const list = (data?.kids || data?.items || data?.kid_profiles || data || []) as any[];
      const normalized: Kid[] = (Array.isArray(list) ? list : []).map((k: any) => ({
        kid_id: String(k.kid_id || k.id || ""),
        name: String(k.name || k.first_name || "Unknown Kid"),
        parent_id: k.parent_id ? String(k.parent_id) : (k.player_id ? String(k.player_id) : undefined),
      })).filter((k) => k.kid_id);
      setKids(normalized);
    } catch (e: any) {
      console.warn("Failed to load kids list:", e);
      setKids([]);
    }

    setLoadingMembers(false);
  }, []);

  // Default refresh: just reload requests and members (not events, since events now require group/month)
  const refresh = useCallback(() => {
    loadRequests();
    loadMembers();
  }, [loadRequests, loadMembers]);

  // Removed old useEffect that called loadEvents with no arguments
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const addPlayers = useCallback(
    async (eventId: string, playerIds: string[] = [], kidIds: string[] = []) => {
      await apiPost(`/api/admin/events/${encodeURIComponent(eventId)}/add-players`, {
        player_ids: playerIds,
        kid_ids: kidIds,
      });
      refresh();
    },
    [refresh]
  );

  const approveRequest = useCallback(
    async (requestId: string) => {
      await apiPost(`/api/admin/participation-requests/${encodeURIComponent(requestId)}/approve`, {});
      refresh();
    },
    [refresh]
  );

  const rejectRequest = useCallback(
    async (requestId: string) => {
      await apiPost(`/api/admin/participation-requests/${encodeURIComponent(requestId)}/reject`, {});
      refresh();
    },
    [refresh]
  );

  // Event lookup map for Requests UI
  const eventById = useMemo(() => {
    const m = new Map<string, AdminEvent>();
    for (const ev of events) {
      if (ev?.event_id) m.set(ev.event_id, ev);
    }
    return m;
  }, [events]);

  return {
    // raw
    events,
    requests,
    players,
    kids,

    // loading & error
    loadingEvents,
    loadingRequests,
    loadingMembers,
    error,

    // derived helpers
    monthOptions,
    monthLabelFromKey,
    deriveEventGroup,
    toDate,
    monthKey,
    eventById,

    // actions
    addPlayers,
    approveRequest,
    rejectRequest,
    refresh,
    loadEvents,
  };
}
