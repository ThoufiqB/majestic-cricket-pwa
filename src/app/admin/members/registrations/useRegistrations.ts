"use client";

import { useState } from "react";
import type { RegistrationRequest } from "@/lib/types/auth";

/**
 * Hook to manage registration requests
 */
export function useRegistrations() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function fetchRequests(status: "pending" | "approved" | "rejected" | "all" = "pending") {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/registrations?status=${status}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to fetch requests");
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (e: any) {
      console.error("Error fetching requests:", e);
      setError(e?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  async function approveRequest(uid: string, details?: {
    group?: string;
    member_type?: string;
    phone?: string;
    notes?: string;
  }) {
    try {
      const response = await fetch(`/api/admin/registrations/${uid}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(details || {}),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to approve request");
      }

      // Refresh list
      await fetchRequests("pending");
      return true;
    } catch (e: any) {
      console.error("Error approving request:", e);
      throw e;
    }
  }

  async function rejectRequest(uid: string, reason: string, notes?: string) {
    try {
      const response = await fetch(`/api/admin/registrations/${uid}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          reason,
          notes: notes || undefined,
          allow_resubmit: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to reject request");
      }

      // Refresh list
      await fetchRequests("pending");
      return true;
    } catch (e: any) {
      console.error("Error rejecting request:", e);
      throw e;
    }
  }

  return {
    requests,
    loading,
    error,
    fetchRequests,
    approveRequest,
    rejectRequest,
  };
}
