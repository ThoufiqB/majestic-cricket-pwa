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

/**
 * POST /api/kids/{kidId}/paid
 * Mark a kid's payment as pending for an event
 * 
 * Body: { event_id: string, paid_status: "PENDING" }
 * 
 * Verifies:
 * - User is logged in
 * - User is the kid's parent
 * - Kid exists
 * - Event exists and is a kids event
 * - Admin has marked the kid as attended
 */
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
      // Kid not found by direct ID - try to find it from parent's kids_profiles list
      const parentSnapshot = await adminDb.collection("players").doc(u.uid).get();
      const parentData = parentSnapshot.data();
      const parentKidsIds = parentData?.kids_profiles || [];
      
      if (!parentKidsIds.includes(kidId)) {
        return NextResponse.json({ error: "Kid not found or not authorized" }, { status: 404 });
      }
    } else {
      const kidData = kidSnap.data();
      // ✅ Check both parent_id and player_id for backward compatibility
      const isParent = kidData?.parent_id === u.uid || kidData?.player_id === u.uid;

      if (!isParent) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    // Verify the event exists and is a kids event
    const eventRef = adminDb.collection("events").doc(event_id);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const eventData = eventSnap.data();
    const isKidsEvent = eventData?.kids_event === true;

    if (!isKidsEvent) {
      return NextResponse.json(
        { error: "This event is not a kids event" },
        { status: 400 }
      );
    }

    // ✅ SINGLE SOURCE OF TRUTH: events/{eventId}/kids_attendance/{kidId}
    const attendanceRef = eventRef.collection("kids_attendance").doc(kidId);
    const attendanceSnap = await attendanceRef.get();

    if (!attendanceSnap.exists) {
      return NextResponse.json(
        { error: "No attendance record found. Please mark attendance first." },
        { status: 400 }
      );
    }

    const attendanceData = attendanceSnap.data() || {};

    // Check if admin has marked as attended
    const attended = !!attendanceData.attended;
    if (!attended) {
      return NextResponse.json(
        { error: "Admin must mark you as attended before you can mark payment." },
        { status: 400 }
      );
    }

    // Update payment status
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
