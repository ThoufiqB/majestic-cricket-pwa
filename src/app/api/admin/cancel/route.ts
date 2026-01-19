import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminUser } from "@/lib/requireAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();

    const body = await req.json().catch(() => ({}));
    const event_id = String(body.event_id || "").trim();
    if (!event_id) return NextResponse.json({ error: "event_id required" }, { status: 400 });

    await adminDb.collection("events").doc(event_id).set(
      {
        status: "cancelled",
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const m = String(e?.message || e);
    const status = m.toLowerCase().includes("missing auth") ? 401 : m === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: m }, { status });
  }
}
