import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminUser } from "@/lib/requireAdmin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

function norm(s: any) {
  return String(s || "").trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const { me } = await requireAdminUser();

    const body = await req.json().catch(() => ({}));

    const title = String(body.title || "").trim();
    const event_type = norm(body.event_type);
    const group = norm(body.group);
    const starts_at = String(body.starts_at || "").trim(); // ISO string
    const fee = Number(body.fee || 0);

    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    if (!event_type) return NextResponse.json({ error: "event_type required" }, { status: 400 });
    if (!group) return NextResponse.json({ error: "group required" }, { status: 400 });
    if (!starts_at) return NextResponse.json({ error: "starts_at required" }, { status: 400 });
    if (!Number.isFinite(fee) || fee < 0) return NextResponse.json({ error: "fee invalid" }, { status: 400 });

    const dt = new Date(starts_at);
    if (isNaN(dt.getTime())) return NextResponse.json({ error: "starts_at must be ISO date" }, { status: 400 });

    const docRef = adminDb.collection("events").doc();
    await docRef.set({
      title,
      event_type,
      group,
      starts_at: Timestamp.fromDate(dt),
      fee,
      status: "scheduled",
      created_at: FieldValue.serverTimestamp(),
      created_by: me.player_id,
    });

    return NextResponse.json({ ok: true, event_id: docRef.id });
  } catch (e: any) {
    const m = String(e?.message || e);
    const status = m.toLowerCase().includes("missing auth") ? 401 : m === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: m }, { status });
  }
}
