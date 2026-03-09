// src/app/api/admin/kids-events/[eventId]/attendees/[playerId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

async function requireAdmin() {
  const u = await requireSessionUser();
  const snap = await adminDb.collection("players").doc(u.uid).get();
  const me = snap.data() || {};
  if (String(me.role || "").toLowerCase() !== "admin") {
    throw new Error("Forbidden");
  }
  return u.uid;
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ eventId: string; playerId: string }> }
) {
  try {
    await requireAdmin();

    const { eventId, playerId } = await ctx.params;
    const eid = String(eventId || "").trim();
    const pid = String(playerId || "").trim();

    if (!eid || !pid) {
      return NextResponse.json({ error: "Missing eventId or playerId" }, { status: 400 });
    }

    const evRef = adminDb.collection("events").doc(eid);
    const evSnap = await evRef.get();

    if (!evSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // For kids events, use kids_attendance subcollection
    const attendeeRef = evRef.collection("kids_attendance").doc(pid);
    const attendeeSnap = await attendeeRef.get();

    if (!attendeeSnap.exists) {
      return NextResponse.json({ error: "Kid attendee not found" }, { status: 404 });
    }

    // Delete the kids attendance record
    await attendeeRef.delete();

    return NextResponse.json({ success: true, message: "Kid removed from event successfully" });
  } catch (err: any) {
    const msg = String(err?.message || err);
    const status = msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
