import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

type Ctx = { params: Promise<{ eventId: string }> };

type PaidStatus = "UNPAID" | "PENDING" | "PAID" | "REJECTED";

function normPaid(v: any): PaidStatus {
  const s = String(v || "").toUpperCase();
  if (s === "PAID" || s === "PENDING" || s === "REJECTED") return s;
  return "UNPAID";
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const u = await requireSessionUser();
    const { eventId } = await ctx.params;

    const id = String(eventId || "");
    if (!id) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const paid_status = normPaid(body?.paid_status);

    // Player should only be able to set PENDING (optional guard)
    if (paid_status !== "PENDING") {
      return NextResponse.json({ error: "Invalid paid_status" }, { status: 400 });
    }

    // Check if this is a membership_fee event
    const evSnap = await adminDb.collection("events").doc(id).get();
    const event = evSnap.data() || {};
    const isMembership = String(event.event_type || "").toLowerCase() === "membership_fee";

    // ✅ SINGLE SOURCE OF TRUTH
    const ref = adminDb.collection("events").doc(id).collection("attendees").doc(u.uid);

    // For membership fees, automatically set attending=YES (no RSVP concept for memberships)
    const attendeeUpdate: any = {
      player_id: u.uid,
      name: String(u.name || ""),
      email: String(u.email || ""),
      paid_status: "PENDING",
      paid_updated_at: adminTs.now(),
      updated_at: adminTs.now(),
    };

    if (isMembership) {
      attendeeUpdate.attending = "YES"; // Auto-mark attending for membership
    }

    await ref.set(attendeeUpdate, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 401 });
  }
}
