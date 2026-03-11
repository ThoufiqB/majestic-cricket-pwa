import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { calculateEventFee } from "@/lib/calculateFee";
import { deriveCategory } from "@/lib/deriveCategory";

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
    
    // Check both old format (kids_event + group="all_kids") and new format (targetGroups includes "Kids")
    const isKidsEvent = eventData?.kids_event === true || 
                        (Array.isArray(eventData?.targetGroups) && eventData.targetGroups.includes("Kids"));
    
    // Validate that provided IDs match event type
    if (!isKidsEvent && kidIds.length > 0) {
      return NextResponse.json({ error: "This event is not a kids event" }, { status: 400 });
    }
    if (isKidsEvent && playerIds.length > 0) {
      return NextResponse.json({ error: "Provide kid_ids for a kids event" }, { status: 400 });
    }
    // Begin batch update
    const batch = adminDb.batch();
    if (!isKidsEvent) {
      // ✅ FIX: Fetch player data and calculate discounted fees
      const baseFee = Number(eventData.fee || 0);
      const eventTargetGroups: string[] = Array.isArray(eventData.targetGroups) ? eventData.targetGroups : [];
      
      // Fetch all player documents in parallel
      const playerRefs = playerIds.map((pid) => adminDb.collection("players").doc(pid));
      const playerSnaps = playerRefs.length > 0 ? await adminDb.getAll(...playerRefs) : [];
      
      // Add adult players with calculated fees
      playerSnaps.forEach((snap, idx) => {
        const pid = playerIds[idx];
        const playerData: any = snap.data() || {};
        
        // Get player's groups and member type for discount calculation
        const playerGroups = Array.isArray(playerData.groups) ? playerData.groups : [];
        const memberType = playerData.member_type;
        const category = deriveCategory(playerData.gender, playerData.hasPaymentManager, playerData.group, playerData.groups);
        
        // Calculate discounted fee (youth/student discount)
        const fee_due = calculateEventFee(baseFee, memberType, playerGroups, eventTargetGroups);
        
        const attendeeRef = eventRef.collection("attendees").doc(pid);
        batch.set(
          attendeeRef,
          {
            player_id: pid,
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
      });
    } else {
      // ✅ FIX: Fetch kid profiles and add complete attendance records
      const baseFee = Number(eventData.fee || 0);
      
      // Fetch kid profiles to get names
      const kidRefs = kidIds.map((kid) => adminDb.collection("kids_profiles").doc(kid));
      const kidSnaps = kidRefs.length > 0 ? await adminDb.getAll(...kidRefs) : [];
      
      // Add kids with all required fields
      kidSnaps.forEach((snap, idx) => {
        const kid = kidIds[idx];
        const kidData: any = snap.data() || {};
        
        const kidRef = eventRef.collection("kids_attendance").doc(kid);
        batch.set(
          kidRef,
          {
            kid_id: kid,
            name: String(kidData.name || "Unknown Kid"),  // ✅ Add name
            attending: true,
            attended: true,                                 // ✅ Admin confirms attendance by adding
            fee_due: baseFee,                              // ✅ Add base fee
            payment_status: "unpaid",                      // ✅ Initialize payment status
            marked_at: new Date(),
            updated_at: adminTs.now(),
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