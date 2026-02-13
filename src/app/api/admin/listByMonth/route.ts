import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

async function requireAdmin() {
  const u = await requireSessionUser();
  const snap = await adminDb.collection("players").doc(u.uid).get();
  const me = snap.data() || {};
  if (String(me.role || "").toLowerCase() !== "admin") {
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 }) };
  }
  return { ok: true as const, uid: u.uid };
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
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return null;
}

function hasStarted(starts_at: any) {
  const d = typeof starts_at?.toDate === "function" ? starts_at.toDate() : new Date(starts_at);
  if (!d || isNaN(d.getTime())) return false;
  return Date.now() >= d.getTime();
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  try {
    const body = await req.json().catch(() => ({}));
    const month = String(body.month || "");
    const group = String(body.group || "all").toLowerCase();
    const view = String(body.view || "scheduled").toLowerCase(); // scheduled|past|all

    if (!month) return NextResponse.json({ error: "Missing month" }, { status: 400 });

    const { start, end } = monthRangeUtc(month);

    let q: FirebaseFirestore.Query = adminDb
      .collection("events")
      .where("starts_at", ">=", start)
      .where("starts_at", "<", end)
      .orderBy("starts_at", "asc");

    // Note: Cannot filter targetGroups array in query, will filter client-side
    const snap = await q.get();

    // ✅ compute stats from attendees or kids_attendance based on event type
    const events = await Promise.all(
      snap.docs.map(async (d) => {
        const raw: any = d.data() || {};
        const started = hasStarted(raw.starts_at);

        // view filter
        if (view === "scheduled" && started) return null;
        if (view === "past" && !started) return null;

        // group filter (supports both legacy group field and new targetGroups array)
        if (group !== "all") {
          const targetGroups = raw.targetGroups || [];
          const legacyGroup = String(raw.group || "").toLowerCase();
          const groupLower = group.toLowerCase();
          
          // Check if event matches the selected group
          const matchesTargetGroups = Array.isArray(targetGroups) && 
            targetGroups.some((g: string) => String(g || "").toLowerCase() === groupLower);
          const matchesLegacyGroup = legacyGroup === groupLower;
          
          if (!matchesTargetGroups && !matchesLegacyGroup) return null;
        }

        // ✅ For kids events, use kids_attendance collection
        const isKidsEvent = raw.kids_event === true;
        const collectionName = isKidsEvent ? "kids_attendance" : "attendees";
        const attSnap = await d.ref.collection(collectionName).get();


        let going = 0;
        let paid = 0;
        let unpaid = 0;
        let pending = 0;
        let rejected = 0;

        attSnap.docs.forEach((a) => {
          const v: any = a.data() || {};
          // Only count stats for those attending (YES)
          const attendingValue = v.attending === true || String(v.attending || "").toUpperCase() === "YES";
          if (!attendingValue) return;
          going++;

          // Kids use payment_status, adults use paid_status
          const ps = String(v.payment_status || v.paid_status || "UNPAID").toUpperCase();
          if (ps === "PAID") paid++;
          else if (ps === "PENDING") pending++;
          else if (ps === "REJECTED") rejected++;
          else unpaid++;
        });

        return {
          event_id: d.id,
          ...raw,
          starts_at: toIso(raw.starts_at),
          created_at: toIso(raw.created_at),
          updated_at: toIso(raw.updated_at),
          _is_past: started,
          stats: { going, paid, unpaid, pending, rejected },
        };
      })
    );

    return NextResponse.json({ events: events.filter(Boolean), ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
