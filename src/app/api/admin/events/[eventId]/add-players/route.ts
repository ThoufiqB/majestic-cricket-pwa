import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

/**
 * POST /api/admin/events/{eventId}/add-players
 *
 * Add one or more players or kids to an event after the event has
 * started or attendance has closed.  Only admins may call this.
 * The request body should contain either `player_ids` (array of
 * strings) or `kid_ids` (array of strings), depending on whether the
 * event is for adults or kids.  Each subject is added to the
 * appropriate attendance subcollection and marked as attending and
 * attended by default.
 */
type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { eventId } = await ctx.params;
    const id = String(eventId || "");
    if (!id) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }
    // Verify admin role
    const meSnap = await adminDb.collection("players").doc(user.uid).get();
    const me: any = meSnap.data() || {};
    if (String(me?.role || "").toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Parse body
    const body = await req.json().catch(() => ({}));
    const playerIds: string[] = Array.isArray(body?.player_ids) ? body.player_ids.map((x: any) => String(x)) : [];
    const kidIds: string[] = Array.isArray(body?.kid_ids) ? body.kid_ids.map((x: any) => String(x)) : [];
    if (playerIds.length === 0 && kidIds.length === 0) {
      return NextResponse.json({ error: "Please provide player_ids or kid_ids" }, { status: 400 });
    }
    // Fetch event data to determine if it is a kids event.
    const eventRef = adminDb.collection("events").doc(id);
    const eventSnap = await eventRef.get();
    const eventData: any = eventSnap.data() || {};
    const isKidsEvent = eventData?.kids_event === true;
    const isAllKidsGroup = String(eventData?.group || "").toLowerCase() === "all_kids";
    // Validate that provided IDs match event type
    if (isKidsEvent && !isAllKidsGroup && kidIds.length > 0) {
      // Kids events should have group all_kids; if not, reject
      return NextResponse.json({ error: "Cannot add kids to this event" }, { status: 400 });
    }
    if (!isKidsEvent && kidIds.length > 0) {
      return NextResponse.json({ error: "This event is not a kids event" }, { status: 400 });
    }
    if (isKidsEvent && playerIds.length > 0) {
      return NextResponse.json({ error: "Provide kid_ids for a kids event" }, { status: 400 });
    }
    // Begin batch update
    const batch = adminDb.batch();
    if (!isKidsEvent) {
      // Add adult players
      playerIds.forEach((pid) => {
        const attendeeRef = eventRef.collection("attendees").doc(pid);
        batch.set(
          attendeeRef,
          {
            player_id: pid,
            attending: "YES",
            attended: true,
            updated_at: adminTs.now(),
          },
          { merge: true }
        );
      });
    } else {
      // Add kids
      kidIds.forEach((kid) => {
        const kidRef = eventRef.collection("kids_attendance").doc(kid);
        batch.set(
          kidRef,
          {
            kid_id: kid,
            attending: true,
            marked_at: new Date(),
          },
          { merge: true }
        );
      });
    }
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}