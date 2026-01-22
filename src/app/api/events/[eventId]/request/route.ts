import { requireSessionUser } from "@/lib/requireSession";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/events/{eventId}/request
 *
 * Allow a player or parent to request participation in an event after
 * the attendance cut‑off has passed but before the event starts.  A
 * participation request is recorded in the `participation_requests`
 * collection.  Duplicate requests are not permitted.  Requests are only
 * allowed for events that define a non‑zero `attendance_cutoff_hours`,
 * either explicitly on the event document or implicitly via the
 * `net_practice` event type (48 hours by default).
 *
 * Body parameters:
 * - kid_id: optional string.  When supplied, indicates the request is for a
 *   kid profile.  The caller must be the kid’s parent.
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

    const body = await req.json().catch(() => ({}));
    const kidId: string | null = body?.kid_id ? String(body.kid_id) : null;

    // Fetch the event and compute the attendance cut‑off.
    const eventSnap = await adminDb.collection("events").doc(id).get();
    const eventData: any = eventSnap.data();
    if (!eventData) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Determine the cut‑off window.  If the event document defines
    // `attendance_cutoff_hours` use it; otherwise default to 48 for
    // net_practice events and 0 for others.
    const explicitCutoff = typeof eventData.attendance_cutoff_hours === "number"
      ? Number(eventData.attendance_cutoff_hours)
      : null;
    const isNetPractice = String(eventData?.event_type || "").toLowerCase() === "net_practice";
    const cutOffHours = explicitCutoff !== null ? explicitCutoff : (isNetPractice ? 48 : 0);

    if (cutOffHours <= 0) {
      // Participation requests are not enabled for this event type.
      return NextResponse.json({ error: "Participation requests not permitted for this event" }, { status: 400 });
    }

    // Compute timing boundaries.
    const startsAtValue: any = eventData.starts_at;
    let startsAt: Date;
    if (startsAtValue && typeof startsAtValue.toDate === "function") {
      startsAt = startsAtValue.toDate();
    } else {
      startsAt = new Date(startsAtValue);
    }
    const now = new Date();
    const cutoffTime = new Date(startsAt.getTime() - cutOffHours * 60 * 60 * 1000);

    // Disallow requests before the cut‑off and after the event has started.
    if (now < cutoffTime) {
      return NextResponse.json({ error: "Cut‑off not reached yet" }, { status: 400 });
    }
    if (now >= startsAt) {
      return NextResponse.json({ error: "Event has already started" }, { status: 400 });
    }

    // Determine the subject of the request: adult or kid.
    let requestType: "adult" | "kid" = "adult";
    let subjectId: string = user.uid;
    let subjectName: string = "";
    if (kidId) {
      // Fetch kid profile to verify parent and get name.
      const kidSnap = await adminDb.collection("kids_profiles").doc(kidId).get();
      const kidData: any = kidSnap.data() || {};
      const isParent = kidData?.parent_id === user.uid || kidData?.player_id === user.uid;
      if (!isParent) {
        return NextResponse.json({ error: "Not authorized to request for this kid" }, { status: 403 });
      }
      requestType = "kid";
      subjectId = kidId;
      subjectName = String(kidData?.name || kidData?.first_name || `Kid ${kidId.substring(0, 8)}`);
    } else {
      // Adult request – fetch player name for reference.
      const playerSnap = await adminDb.collection("players").doc(user.uid).get();
      const playerData: any = playerSnap.data() || {};
      subjectName = String(playerData?.name || user.name || "");
    }

    // Compose a deterministic document ID to prevent duplicates.  A composite
    // key of eventId and subjectId ensures one request per subject.
    const docId = `${id}_${subjectId}`;
    const reqRef = adminDb.collection("participation_requests").doc(docId);
    const reqSnap = await reqRef.get();
    if (reqSnap.exists) {
      // If there is already a request (pending or resolved), do not create another.
      return NextResponse.json({ error: "Participation request already exists" }, { status: 400 });
    }

    // Persist the request.
    await reqRef.set({
      event_id: id,
      subject_id: subjectId,
      subject_name: subjectName,
      type: requestType,
      requested_by: user.uid,
      requested_at: adminTs.now(),
      status: "pending",
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}