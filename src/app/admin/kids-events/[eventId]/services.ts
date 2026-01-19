import { apiGet, apiPost } from "@/app/client/api";
import type { EventInfo, PaidStatus, PlayerAttendanceRow } from "./types";

export async function getAdminKidsEventAttendance(
  eventId: string
): Promise<{ event: EventInfo | null; rows: PlayerAttendanceRow[] }> {
  const data = await apiGet(`/api/admin/events/${encodeURIComponent(eventId)}/attendance`);
  return { event: (data.event || null) as EventInfo | null, rows: (data.rows || []) as PlayerAttendanceRow[] };
}

export async function adminUpdateKidsEventAttendance(
  eventId: string,
  playerId: string,
  patch: { attending?: string; attended?: boolean; paid_status?: PaidStatus; fee_due?: number | null }
) {
  return apiPost(`/api/admin/events/${encodeURIComponent(eventId)}/attendance`, {
    player_id: playerId,
    ...patch,
  });
}
