import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const u = await requireSessionUser();
    const { eventId } = await ctx.params;

    const id = String(eventId || "");
    if (!id) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const attending = String(body?.attending || "").toUpperCase(); // "YES" | "NO"
    if (attending !== "YES" && attending !== "NO") {
      return NextResponse.json({ error: "Invalid attending value" }, { status: 400 });
    }

    // pull player profile for consistent group/name
    const meSnap = await adminDb.collection("players").doc(u.uid).get();
    const me: any = meSnap.data() || {};
    const group = String(me.group || "").toLowerCase();
    const safeGroup = group === "men" || group === "women" ? group : "";

    const ref = adminDb.collection("events").doc(id).collection("attendees").doc(u.uid);

    await ref.set(
      {
        player_id: u.uid,
        name: String(me.name || u.name || ""),
        email: String(me.email || u.email || ""),
        group: safeGroup, // ✅ important for Friends Going
        attending,
        updated_at: adminTs.now(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 401 });
  }
}
