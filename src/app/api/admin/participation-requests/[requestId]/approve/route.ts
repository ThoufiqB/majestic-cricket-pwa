import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

/**
 * POST /api/admin/participation-requests/{requestId}/approve
 *
 * Approve a participation request.  Only admins may call this.
 * When approved, the subject (player or kid) is added to the
 * appropriate attendance subcollection for the event, marked as
 * attending and attended by default.  The request status is
 * updated to 'approved'.
 */
type Ctx = { params: Promise<{ requestId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const u = await requireSessionUser();
    if (!u) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { requestId } = await ctx.params;
    const rid = String(requestId || "");
    if (!rid) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }
    // Verify admin role
    const meSnap = await adminDb.collection("players").doc(u.uid).get();
    const me: any = meSnap.data() || {};
    if (String(me?.role || "").toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const ref = adminDb.collection("participation_requests").doc(rid);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    const data: any = snap.data();
    if (data.status !== "pending") {
      return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
    }
    const eventId = String(data.event_id);
    const subjectId = String(data.subject_id);
    const type = String(data.type);
    // Approve the request and update attendance.
    // Wrap updates in a batch so that state remains consistent.
    const batch = adminDb.batch();
    // Update request status
    batch.update(ref, {
      status: "approved",
      resolved_at: adminTs.now(),
      resolved_by: u.uid,
    });
    const eventRef = adminDb.collection("events").doc(eventId);
    if (type === "adult") {
      const attendeeRef = eventRef.collection("attendees").doc(subjectId);
      batch.set(
        attendeeRef,
        {
          player_id: subjectId,
          attending: "YES",
          attended: true,
          updated_at: adminTs.now(),
        },
        { merge: true }
      );
    } else {
      // kid
      const kidRef = eventRef.collection("kids_attendance").doc(subjectId);
      batch.set(
        kidRef,
        {
          kid_id: subjectId,
          attending: true,
          marked_at: new Date(),
        },
        { merge: true }
      );
    }
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}