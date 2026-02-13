import { getFriendsSummaryForEvent } from "@/lib/friendsSummary";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthRangeUtc(monthKey: string) {
  const [yy, mm] = String(monthKey || "").split("-").map((x) => Number(x));
  const y = Number.isFinite(yy) ? yy : new Date().getUTCFullYear();
  const m = Number.isFinite(mm) ? mm : new Date().getUTCMonth() + 1;

  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  return { start, end };
}

function toIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString(); // Firestore Timestamp
  return null;
}

function normPaidStatus(v: any) {
  const s = String(v || "").toUpperCase();
  if (s === "PAID" || s === "PENDING" || s === "REJECTED") return s;
  return "UNPAID";
}

function normAttending(v: any) {
  const s = String(v || "").toUpperCase();
  if (s === "YES" || s === "NO") return s;
  return "UNKNOWN";
}

function mapEventDoc(d: FirebaseFirestore.QueryDocumentSnapshot) {
  const raw: any = d.data() || {};
  return {
    event_id: d.id,
    ...raw,
    starts_at: toIso(raw.starts_at),
    created_at: toIso(raw.created_at),
    updated_at: toIso(raw.updated_at),
  };
}

async function attachMyForUser(uid: string, events: any[]) {
  if (!events.length) return events;

  const refs = events.map((ev) =>
    adminDb.collection("events").doc(ev.event_id).collection("attendees").doc(uid)
  );

  const snaps = refs.length ? await adminDb.getAll(...refs) : [];

  const myByEventId = new Map<string, any>();
  snaps.forEach((s) => {
    if (!s.exists) return;
    const parentEventId = s.ref.parent.parent?.id;
    if (!parentEventId) return;

    const a: any = s.data() || {};
    myByEventId.set(parentEventId, {
      attending: normAttending(a.attending),
      attended: !!a.attended,
      paid_status: normPaidStatus(a.paid_status),
      fee_due:
        a.fee_due === null || typeof a.fee_due === "undefined" || a.fee_due === ""
          ? null
          : Number(a.fee_due),
    });
  });

  return events.map((ev) => ({
    ...ev,
    my: myByEventId.get(ev.event_id) || { attending: "UNKNOWN", attended: false, paid_status: "UNPAID" },
  }));
}

// ✅ Attach kid attendance from kids_attendance collection
async function attachMyForKid(kidId: string, events: any[]) {
  if (!events.length) return events;

  const refs = events.map((ev) =>
    adminDb.collection("events").doc(ev.event_id).collection("kids_attendance").doc(kidId)
  );

  const snaps = refs.length ? await adminDb.getAll(...refs) : [];

  const myByEventId = new Map<string, any>();
  snaps.forEach((s) => {
    if (!s.exists) return;
    const parentEventId = s.ref.parent.parent?.id;
    if (!parentEventId) return;

    const a: any = s.data() || {};
    myByEventId.set(parentEventId, {
      attending: a.attending === true || String(a.attending).toUpperCase() === "YES" ? "YES" : "NO",
      attended: !!a.attended, // ✅ Kids have attended field set by admin
      paid_status: normPaidStatus(a.payment_status),
      fee_due: null, // Kids fees handled differently
    });
  });

  return events.map((ev) => ({
    ...ev,
    my: myByEventId.get(ev.event_id) || { attending: "UNKNOWN", attended: false, paid_status: "UNPAID" },
  }));
}

export async function GET(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    const uid = u.uid;

    const meSnap = await adminDb.collection("players").doc(uid).get();
    const me: any = meSnap.data() || {};
    const isAdmin = String(me.role || "").toLowerCase() === "admin";

    const { searchParams } = new URL(req.url);

    const month =
      searchParams.get("month") ||
      `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}`;

    const type = (searchParams.get("type") || "all").toLowerCase();
    const yearStr = searchParams.get("year");
    const year = yearStr ? Number(yearStr) : undefined;

    // group rules
    const meGroup = String(me.group || "").toLowerCase();
    const qGroup = String(searchParams.get("group") || "").toLowerCase();
    
    // Check if requesting kids events
    const isKidsEventRequest = qGroup === "all_kids";
    
    // ✅ Determine if we should load kid attendance based on the GROUP being requested
    // NOT based on active_profile_id (which persists in DB and causes issues when switching back)
    const isViewingAsKid = isKidsEventRequest;
    const activeProfileId = me.active_profile_id || uid;
    
    const group =
      isAdmin && !isKidsEventRequest
        ? (qGroup || "all")
        : isKidsEventRequest
        ? "all_kids"
        : (meGroup === "men" || meGroup === "women" ? meGroup : "men");

    const eventsRef = adminDb.collection("events");

    // membership_fee per-year
    if (type === "membership_fee") {
      const y = Number.isFinite(Number(year)) ? Number(year) : new Date().getFullYear();
      const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0, 0));

      // Query: fetch membership_fee only, filter year + group client-side to avoid composite index
      // TODO: Once Firestore composite index is created, use server-side filters
      let q: FirebaseFirestore.Query = eventsRef.where("event_type", "==", "membership_fee");

      const snap = await q.get();
      let events = snap.docs
        .map(mapEventDoc)
        .filter((ev: any) => {
          // Filter by year (start date range)
          const evStart = new Date(ev.starts_at).getTime();
          if (evStart < start.getTime() || evStart >= end.getTime()) {
            return false;
          }

          // NEW: Check if user's groups intersect with event's targetGroups
          const userGroups = me.groups || [];
          const eventTargetGroups = ev.targetGroups || [];

          // If event has targetGroups, check for intersection
          if (eventTargetGroups.length > 0) {
            const hasMatch = userGroups.some((ug: string) => eventTargetGroups.includes(ug));
            if (!hasMatch) {
              return false;
            }
          } else {
            // Fallback to legacy group filtering
            if (group !== "all" && String(ev.group || "").toLowerCase() !== group.toLowerCase()) {
              return false;
            }
          }

          return true;
        })
        .sort((a: any, b: any) => {
          const aTime = new Date(a.starts_at).getTime();
          const bTime = new Date(b.starts_at).getTime();
          return bTime - aTime; // desc order
        });

      // attach "my" (paid status matters for membership)
      events = isViewingAsKid ? await attachMyForKid(activeProfileId, events) : await attachMyForUser(uid, events);

      return NextResponse.json({ events, group });
    }

    // normal events per-month
    const { start, end } = monthRangeUtc(month);

    // Query: fetch by date range only, filter type/group client-side to avoid composite index requirement
    let q: FirebaseFirestore.Query = eventsRef
      .where("starts_at", ">=", start)
      .where("starts_at", "<", end)
      .orderBy("starts_at", "asc");

    const snap = await q.get();
    let events = snap.docs
      .map(mapEventDoc)
      .filter((ev: any) => {
        // For kids events request, only show kids_event=true
        if (isKidsEventRequest) {
          return ev.kids_event === true || (ev.targetGroups && ev.targetGroups.includes("Kids"));
        }

        // Don't show kids events in adult view
        if (ev.kids_event === true || (ev.targetGroups && ev.targetGroups.includes("Kids"))) {
          return false;
        }

        // Filter by event type
        if (type !== "all" && String(ev.event_type || "").toLowerCase() !== type.toLowerCase()) {
          return false;
        }

        // NEW: Check if user's groups intersect with event's targetGroups
        const userGroups = me.groups || [];
        const eventTargetGroups = ev.targetGroups || [];

        // If event has targetGroups, check for intersection with user's groups
        if (eventTargetGroups.length > 0) {
          const hasMatch = userGroups.some((ug: string) => eventTargetGroups.includes(ug));
          if (!hasMatch) {
            return false; // User's groups don't match event's targetGroups
          }
        } else {
          // Fallback to legacy group filtering for old events without targetGroups
          const evGroup = String(ev.group || "").toLowerCase();
          if (group !== "all" && evGroup !== group.toLowerCase()) {
            return false;
          }
        }

        return true;
      });

    // Attach "my" attendance/payment info
    events = isViewingAsKid ? await attachMyForKid(activeProfileId, events) : await attachMyForUser(uid, events);

    // Phase 2: Attach friendsSummary to each event (non-blocking, sequential for now)
    for (let i = 0; i < events.length; i++) {
      try {
        events[i].friendsSummary = await getFriendsSummaryForEvent(events[i]);
      } catch (e) {
        // If error, skip friendsSummary for this event
        events[i].friendsSummary = undefined;
      }
    }

    return NextResponse.json({ events, group });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 401 });
  }
}
