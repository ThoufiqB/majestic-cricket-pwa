import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { calculateEventFee } from "@/lib/calculateFee";
import { deriveCategory } from "@/lib/deriveCategory";

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
    
    // ✅ FIX: Fetch event data for fee calculation
    const eventRef = adminDb.collection("events").doc(eventId);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const eventData: any = eventSnap.data() || {};
    const baseFee = Number(eventData.fee || 0);
    const eventTargetGroups: string[] = Array.isArray(eventData.targetGroups) ? eventData.targetGroups : [];
    
    // Approve the request and update attendance.
    // Wrap updates in a batch so that state remains consistent.
    const batch = adminDb.batch();
    // Update request status
    batch.update(ref, {
      status: "approved",
      resolved_at: adminTs.now(),
      resolved_by: u.uid,
    });
    
    if (type === "adult") {
      // ✅ FIX: Fetch player data and calculate discounted fee
      const playerSnap = await adminDb.collection("players").doc(subjectId).get();
      const playerData: any = playerSnap.data() || {};
      
      const playerGroups = Array.isArray(playerData.groups) ? playerData.groups : [];
      const memberType = playerData.member_type;
      const category = deriveCategory(playerData.gender, playerData.hasPaymentManager, playerData.group, playerData.groups);
      
      // Calculate discounted fee (youth/student discount)
      const fee_due = calculateEventFee(baseFee, memberType, playerGroups, eventTargetGroups);
      
      const attendeeRef = eventRef.collection("attendees").doc(subjectId);
      batch.set(
        attendeeRef,
        {
          player_id: subjectId,
          name: String(playerData.name || ""),
          email: String(playerData.email || ""),
          category,
          groups: playerGroups,
          attending: "YES",
          attended: true,
          fee_due, // ✅ Store calculated discounted fee
          updated_at: adminTs.now(),
        },
        { merge: true }
      );
    } else {
      // kid - kids events typically have the youth price already set
      const kidRef = eventRef.collection("kids_attendance").doc(subjectId);
      batch.set(
        kidRef,
        {
          kid_id: subjectId,
          attending: true,
          attended: true,
          fee_due: baseFee, // Kids events already have youth pricing
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