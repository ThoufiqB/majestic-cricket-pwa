import { apiDelete, apiGet, apiPatch, apiPost } from "@/app/client/api";

export type EventRow = {
  event_id: string;
  title: string;
  event_type: string;
  targetGroups?: string[]; // ["Men", "Women", "U-13", "U-15", "U-18"]
  group?: string; // deprecated, kept for backward compatibility
  starts_at: string;
  fee: number;
  status?: string;
  _is_past?: boolean;
  stats?: { going: number; paid: number; unpaid: number; pending: number; rejected?: number };
};

export async function adminListEventsByMonth(args: {
  month: string;
  group: string;
  view: string;
}): Promise<{ events: EventRow[] }> {
  // Use POST endpoint that computes stats from attendees subcollection
  const data = await apiPost("/api/admin/listByMonth", {
    month: args.month,
    group: args.group,
    view: args.view,
  });
  return { events: (data.events || []) as EventRow[] };
}

export async function adminCreateEvent(args: {
  title: string;
  event_type: string;
  targetGroups: string[];
  starts_at: string;
  fee: number;
}) {
  return apiPost("/api/admin/events", args);
}

export async function adminDeleteEvent(eventId: string) {
  return apiDelete(`/api/admin/events/${encodeURIComponent(eventId)}`);
}

export async function adminUpdateEvent(
  eventId: string,
  patch: { title?: string; starts_at?: string; fee?: number; targetGroups?: string[] }
) {
  return apiPatch(`/api/admin/events/${encodeURIComponent(eventId)}`, patch);
}
