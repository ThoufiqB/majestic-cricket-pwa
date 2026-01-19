import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
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

function parseStartsAt(v: any): Date | null {
  if (!v) return null;
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  try {
    const body = await req.json().catch(() => ({}));

    const title = String(body.title || "").trim();
    const event_type = String(body.event_type || "").trim().toLowerCase();
    const group = String(body.group || "").trim().toLowerCase();
    const fee = Number(body.fee ?? 0);
    const startsAt = parseStartsAt(body.starts_at);

    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });
    if (!event_type) return NextResponse.json({ error: "Missing event_type" }, { status: 400 });
    if (!["men", "women", "mixed"].includes(group)) {
      return NextResponse.json({ error: "group must be men, women, or mixed" }, { status: 400 });
    }
    if (!Number.isFinite(fee) || fee < 0) return NextResponse.json({ error: "Invalid fee" }, { status: 400 });
    if (!startsAt) return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 });

    const now = adminTs.now();

    const doc = await adminDb.collection("events").add({
      title,
      event_type,
      group,
      fee,
      starts_at: startsAt, // store as Date (Admin SDK -> Timestamp)
      created_at: now,
      updated_at: now,
      created_by: gate.uid,
      updated_by: gate.uid,
    });

    return NextResponse.json({ ok: true, event_id: doc.id });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
