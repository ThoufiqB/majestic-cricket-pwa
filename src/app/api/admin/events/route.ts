import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
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

async function requireAdmin(uid: string) {
  const snap = await adminDb.collection("players").doc(uid).get();
  const me = snap.data() || {};
  const isAdmin = String(me.role || "").toLowerCase() === "admin";
  if (!isAdmin) throw new Error("Forbidden");
  return me;
}

// GET /api/admin/events?month=YYYY-MM&group=all|men|women|mixed&view=scheduled|past|all
export async function GET(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const { searchParams } = new URL(req.url);
    const month =
      searchParams.get("month") || `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}`;
    const group = String(searchParams.get("group") || "all").toLowerCase();
    const view = String(searchParams.get("view") || "scheduled").toLowerCase();

    const { start, end } = monthRangeUtc(month);
    const now = new Date();

    let q: FirebaseFirestore.Query = adminDb
      .collection("events")
      .where("starts_at", ">=", start)
      .where("starts_at", "<", end)
      .orderBy("starts_at", "asc");

    let events = [];
    if (group === "kids") {
      // For kids, fetch all events for the month, filter in-memory for all kids events
      // (group === 'kids' OR group === 'all_kids' OR kids_event === true)
      // This avoids breaking other group logic and works around Firestore OR limitations
      // (If you have a lot of events, consider optimizing this with Firestore 'in' queries)
      // view filter (optional)
      if (view === "scheduled") q = q.where("starts_at", ">=", now);
      else if (view === "past") q = q.where("starts_at", "<", now);
      // view === "all" -> no extra filter
      const snap = await q.get();
      events = snap.docs.map((d) => {
        const data = d.data() as any;
        const starts = data?.starts_at?.toDate ? data.starts_at.toDate() : new Date(data.starts_at);
        return {
          event_id: d.id,
          ...data,
          _is_past: starts.getTime() <= now.getTime(),
        };
      }).filter(ev => {
        const g = String(ev.group || "").toLowerCase();
        return g === "kids" || g === "all_kids" || ev.kids_event === true;
      });
    } else {
      // All other groups: keep existing logic
      if (group !== "all") q = q.where("group", "==", group);
      if (view === "scheduled") q = q.where("starts_at", ">=", now);
      else if (view === "past") q = q.where("starts_at", "<", now);
      // view === "all" -> no extra filter
      const snap = await q.get();
      events = snap.docs.map((d) => {
        const data = d.data() as any;
        const starts = data?.starts_at?.toDate ? data.starts_at.toDate() : new Date(data.starts_at);
        return {
          event_id: d.id,
          ...data,
          _is_past: starts.getTime() <= now.getTime(),
        };
      });
    }

    return NextResponse.json({ events });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes("forbidden") ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

// POST /api/admin/events  (create)
export async function POST(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const body = await req.json();
    const title = String(body?.title || "").trim();
    const event_type = String(body?.event_type || "").trim().toLowerCase();
    const targetGroups = Array.isArray(body?.targetGroups) ? body.targetGroups : [];
    const fee = Number(body?.fee || 0);
    const starts_at_raw = body?.starts_at;

    if (!title) throw new Error("title required");
    if (!event_type) throw new Error("event_type required");
    
    // Validate targetGroups
    if (!Array.isArray(targetGroups) || targetGroups.length === 0) {
      throw new Error("At least one target group is required");
    }

    const validGroups = ["Men", "Women", "U-13", "U-15", "U-18", "Kids"];
    const invalidGroups = targetGroups.filter((g: string) => !validGroups.includes(g));
    if (invalidGroups.length > 0) {
      throw new Error(`Invalid groups: ${invalidGroups.join(", ")}`);
    }
    
    if (!Number.isFinite(fee) || fee < 0) throw new Error("Invalid fee");
    if (!starts_at_raw) throw new Error("starts_at required");

    const starts_at = new Date(String(starts_at_raw));
    if (Number.isNaN(starts_at.getTime())) throw new Error("Invalid starts_at");
    
    // ✅ Allow membership_fee to be created with past/current dates (fee decided after Jan)
    // Normal events must be in the future
    if (event_type !== "membership_fee" && starts_at.getTime() <= Date.now()) {
      throw new Error("Cannot create an event in the past");
    }

    const now = adminTs.now();

    // Determine if this is a kids event (for backward compatibility)
    const kids_event = targetGroups.includes("Kids");
    
    // For backward compatibility, set group field
    let legacyGroup = "";
    if (kids_event) {
      legacyGroup = "all_kids";
    } else if (targetGroups.includes("Men") && targetGroups.includes("Women")) {
      legacyGroup = "mixed";
    } else if (targetGroups.includes("Men")) {
      legacyGroup = "men";
    } else if (targetGroups.includes("Women")) {
      legacyGroup = "women";
    } else {
      legacyGroup = "youth";
    }

    const ref = await adminDb.collection("events").add({
      title,
      event_type,
      targetGroups,
      group: legacyGroup, // kept for backward compatibility
      fee,
      starts_at,
      kids_event,
      created_at: now,
      updated_at: now,
      created_by: u.uid,
    });

    return NextResponse.json({ ok: true, event_id: ref.id });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes("forbidden") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
