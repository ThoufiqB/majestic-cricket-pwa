import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

type Ctx = { params: Promise<{ eventId: string }> };

type PaidStatus = "UNPAID" | "PENDING" | "PAID" | "REJECTED";

function normPaid(v: any): PaidStatus {
  const s = String(v || "").toUpperCase();
  if (s === "PAID" || s === "PENDING" || s === "REJECTED") return s as PaidStatus;
  return "UNPAID";
}

function isAttendanceConfirmed(data: any): boolean {
  return typeof data?.attended === "boolean" ? data.attended === true : false;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const u = await requireSessionUser();
    const { eventId } = await ctx.params;

    const id = String(eventId || "").trim();
    if (!id) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const paid_status = normPaid(body?.paid_status);

    // Player should only be able to set PENDING
    if (paid_status !== "PENDING") {
      return NextResponse.json({ error: "Invalid paid_status" }, { status: 400 });
    }

    // Verify event exists
    const evRef = adminDb.collection("events").doc(id);
    const evSnap = await evRef.get();
    if (!evSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = evSnap.data() || {};

    // Membership fees: allow payment without attendance confirmation
    // because membership has no RSVP/attendance confirmation concept.
    const isMembership = String(event.event_type || "").toLowerCase() === "membership_fee";
    const isKidsEvent = event.kids_event === true;

    if (isKidsEvent) {
      return NextResponse.json({ error: "This is a kids event. Use kids paid endpoint." }, { status: 400 });
    }

    // SINGLE SOURCE OF TRUTH: events/{eventId}/attendees/{playerId}
    const attendeeRef = evRef.collection("attendees").doc(u.uid);
    const attendeeSnap = await attendeeRef.get();
    const attendeeData: any = attendeeSnap.data() || {};

    // For non-membership events: enforce attendance confirmation gate
    if (!isMembership) {
      // Must have a record and admin must confirm attended === true
      if (!attendeeSnap.exists) {
        return NextResponse.json(
          { error: "No attendance record found. Please mark attendance first." },
          { status: 400 }
        );
      }

      if (!isAttendanceConfirmed(attendeeData)) {
        return NextResponse.json(
          { error: "Awaiting attendance confirmation. Admin must confirm attendance before payment can be marked." },
          { status: 400 }
        );
      }
    }

    // Build update payload
    const update: any = {
      player_id: u.uid,
      name: String(u.name || ""),
      email: String(u.email || ""),
      paid_status: "PENDING",
      paid_updated_at: adminTs.now(),
      updated_at: adminTs.now(),
    };

    // For membership fees: auto-mark attending YES (no RSVP concept)
    if (isMembership) {
      update.attending = "YES";
    }

    await attendeeRef.set(update, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // keep same semantics you had (401 on any error from requireSessionUser etc.)
    return NextResponse.json({ error: String(e?.message || e) }, { status: 401 });
  }
}
