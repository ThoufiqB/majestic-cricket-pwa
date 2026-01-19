import { apiDelete, apiGet, apiPatch, apiPost } from "@/app/client/api";

export type EventRow = {
  event_id: string;
  title: string;
  event_type: string;
  group?: string;
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
  group: string;
  starts_at: string;
  fee: number;
  kids_event?: boolean;
}) {
  return apiPost("/api/admin/events", args);
}

export async function adminDeleteEvent(eventId: string) {
  return apiDelete(`/api/admin/events/${encodeURIComponent(eventId)}`);
}

export async function adminUpdateEvent(
  eventId: string,
  patch: { title?: string; starts_at?: string; fee?: number }
) {
  return apiPatch(`/api/admin/events/${encodeURIComponent(eventId)}`, patch);
}
