import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { Timestamp } from "firebase-admin/firestore";

function norm(s: any) {
  return String(s || "").trim().toLowerCase();
}

function monthRange(month: string) {
  // month = "YYYY-MM"
  const [y, m] = month.split("-").map((x) => Number(x));
  const start = new Date(Date.UTC(y, (m || 1) - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, (m || 1) - 1, 1, 0, 0, 0));
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

export async function POST(req: NextRequest) {
  try {
    await requireSessionUser();
    const body = await req.json().catch(() => ({}));

    const month = String(body.month || "").trim(); // YYYY-MM
    const type = norm(body.type || "all");
    const yearOnly = String(body.year || "").trim(); // optional
    const group = norm(body.group || ""); // men/women (from profile)

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month required in format YYYY-MM" }, { status: 400 });
    }

    const { start, end } = monthRange(month);
    const startTs = Timestamp.fromDate(start);
    const endTs = Timestamp.fromDate(end);

    const eventsRef = adminDb.collection("events");

    // We do broad query by date window; filter rest in memory (small dataset now)
    let q = eventsRef.where("status", "==", "scheduled");

    // If membership_fee: we will filter by year later; still pull scheduled events.
    // Firestore can't do OR easily; keep it simple for now.

    const snap = await q.get();
    const out: any[] = [];

    for (const d of snap.docs) {
      const ev = d.data() as any;
      const evType = norm(ev.event_type);
      const startsAt: Date = ev.starts_at?.toDate ? ev.starts_at.toDate() : new Date(ev.starts_at);

      // Group visibility: check targetGroups array
      if (group) {
        const eventTargetGroups = ev.targetGroups || [];
        const hasMatch = eventTargetGroups.some((tg: string) => norm(tg) === group);
        if (!hasMatch) continue;
      }

      // Type filter
      if (type !== "all" && evType !== type) continue;

      if (evType === "membership_fee") {
        const y = yearOnly || month.split("-")[0];
        if (String(startsAt.getUTCFullYear()) !== String(y)) continue;
      } else {
        if (!(startsAt >= start && startsAt < end)) continue;
      }

      out.push({
        event_id: d.id,
        title: ev.title,
        event_type: ev.event_type,
        targetGroups: ev.targetGroups || [],
        starts_at: startsAt.toISOString(),
        fee: Number(ev.fee || 0),
        status: ev.status,
      });
    }

    out.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    return NextResponse.json({ ok: true, events: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Missing auth" }, { status: 401 });
  }
}
