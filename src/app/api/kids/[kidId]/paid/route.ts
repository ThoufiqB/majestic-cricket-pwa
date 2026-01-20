import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

type Ctx = { params: Promise<{ kidId: string }> };

type PaidStatus = "UNPAID" | "PENDING" | "PAID" | "REJECTED";

function normPaid(v: any): PaidStatus {
  const s = String(v || "").toUpperCase();
  if (s === "PAID" || s === "PENDING" || s === "REJECTED") return s;
  return "UNPAID";
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const u = await requireSessionUser();
    const { kidId } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const event_id = String(body?.event_id || "").trim();
    const paid_status = normPaid(body?.paid_status);

    if (!event_id) return NextResponse.json({ error: "Missing event_id" }, { status: 400 });

    // Player should only be able to set PENDING
    if (paid_status !== "PENDING") {
      return NextResponse.json({ error: "Invalid paid_status" }, { status: 400 });
    }

    // Verify the kid exists and user is the parent
    const kidRef = adminDb.collection("kids_profiles").doc(kidId);
    const kidSnap = await kidRef.get();

    if (!kidSnap.exists) {
      const parentSnapshot = await adminDb.collection("players").doc(u.uid).get();
      const parentData = parentSnapshot.data();
      const parentKidsIds = parentData?.kids_profiles || [];

      if (!parentKidsIds.includes(kidId)) {
        return NextResponse.json({ error: "Kid not found or not authorized" }, { status: 404 });
      }
    } else {
      const kidData = kidSnap.data();
      const isParent = kidData?.parent_id === u.uid || kidData?.player_id === u.uid;
      if (!isParent) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Verify the event exists and is a kids event
    const eventRef = adminDb.collection("events").doc(event_id);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const eventData = eventSnap.data();
    if (eventData?.kids_event !== true) {
      return NextResponse.json({ error: "This event is not a kids event" }, { status: 400 });
    }

    // SINGLE SOURCE OF TRUTH: events/{eventId}/kids_attendance/{kidId}
    const attendanceRef = eventRef.collection("kids_attendance").doc(kidId);
    const attendanceSnap = await attendanceRef.get();

    if (!attendanceSnap.exists) {
      return NextResponse.json(
        { error: "No attendance record found. Please mark attendance first." },
        { status: 400 }
      );
    }

    const attendanceData: any = attendanceSnap.data() || {};

    // BACKWARD COMPAT: attending vs attended
    const isAttending = Boolean(attendanceData.attending ?? attendanceData.attended);
    if (!isAttending) {
      return NextResponse.json(
        { error: "Admin must mark you as attended before you can mark payment." },
        { status: 400 }
      );
    }

    await attendanceRef.set(
      {
        payment_status: "pending",
        paid_updated_at: adminTs.now(),
        updated_at: adminTs.now(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[POST /api/kids/[kidId]/paid]", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
