"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/app/client/api";

/**
 * useManageEvents – A hook for the admin Manage Events page.
 *
 * This hook provides data and handlers for both the Add Players and
 * Requests sections.  It abstracts API calls behind simple methods
 * and stores the resulting lists in state.  Note that the backend
 * endpoints for listing events and participation requests are
 * asynchronous and may change in the future; adjust the endpoints
 * accordingly.
 */
export function useManageEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState<string>("");

  const loadEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      setError("");
      // Admin event listing: reuse existing admin listing endpoint.
      const data = await apiGet("/api/admin/listByMonth?month=all");
      setEvents(data?.events || []);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      setError("");
      const data = await apiGet("/api/admin/participation-requests");
      setRequests(data?.requests || []);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  const refresh = useCallback(() => {
    loadEvents();
    loadRequests();
  }, [loadEvents, loadRequests]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addPlayers = useCallback(async (eventId: string, playerIds: string[] = [], kidIds: string[] = []) => {
    await apiPost(`/api/admin/events/${encodeURIComponent(eventId)}/add-players`, { player_ids: playerIds, kid_ids: kidIds });
    refresh();
  }, [refresh]);

  const approveRequest = useCallback(async (requestId: string) => {
    await apiPost(`/api/admin/participation-requests/${encodeURIComponent(requestId)}/approve`, {});
    refresh();
  }, [refresh]);

  const rejectRequest = useCallback(async (requestId: string) => {
    await apiPost(`/api/admin/participation-requests/${encodeURIComponent(requestId)}/reject`, {});
    refresh();
  }, [refresh]);

  return {
    events,
    requests,
    loadingEvents,
    loadingRequests,
    error,
    addPlayers,
    approveRequest,
    rejectRequest,
    refresh,
  };
}