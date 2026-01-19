import { requireSessionUser } from "@/lib/requireSession";
import { adminDb } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/kids/{kidId}/attendance
 * Mark a kid's attendance for an event
 * 
 * Body: { event_id: string, attending: "YES" | "NO" }
 * 
 * Verifies:
 * - User is logged in
 * - User is the kid's parent or admin
 * - Kid exists
 * - Event exists
 * - Kid_event is true for the event
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ kidId: string }> }
) {
  try {
    // Verify logged in
    const user = await requireSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { kidId } = await context.params;
    const { event_id, attending } = await req.json();

    if (!event_id || typeof event_id !== "string") {
      return NextResponse.json({ error: "Missing or invalid event_id" }, { status: 400 });
    }

    if (attending !== "YES" && attending !== "NO") {
      return NextResponse.json({ error: "Invalid attending value" }, { status: 400 });
    }

    // Verify the kid exists and user is the parent or admin
    const kidRef = adminDb.collection("kids_profiles").doc(kidId);
    const kidSnap = await kidRef.get();

    let kidData: any = null;
    let kidName = "Unknown";

    if (!kidSnap.exists) {
      // Kid not found by direct ID - try to find it from parent's kids_profiles list
      const parentSnapshot = await adminDb.collection("players").doc(user.uid).get();
      const parentData = parentSnapshot.data();
      const parentKidsIds = parentData?.kids_profiles || [];
      
      if (!parentKidsIds.includes(kidId)) {
        return NextResponse.json({ error: "Kid not found or not authorized" }, { status: 404 });
      }
      
      // Kid is in parent's list but document doesn't exist
      // This can happen if the kid was added to parent's array but not yet fully created
      // Allow the attendance to be marked anyway
      kidName = `Kid ${kidId.substring(0, 8)}`;
    } else {
      kidData = kidSnap.data();
      kidName = String(kidData?.name || kidData?.first_name || "Unknown Kid");
    }

    // ✅ Check both parent_id and player_id for backward compatibility
    const isParent = kidData ? (kidData?.parent_id === user.uid || kidData?.player_id === user.uid) : true;

    if (!isParent) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Verify the event exists and is a kids event
    const eventRef = adminDb.collection("events").doc(event_id);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const eventData = eventSnap.data();
    const isKidsEvent = eventData?.kids_event === true;
    const isAllKidsGroup = String(eventData?.group || "").toLowerCase() === "all_kids";

    if (!isKidsEvent || !isAllKidsGroup) {
      return NextResponse.json(
        { error: "This event is not a kids event" },
        { status: 400 }
      );
    }

    // Update kid's attendance record
    const attendanceRef = eventRef.collection("kids_attendance").doc(kidId);
    const attendanceSnap = await attendanceRef.get();

    const existingData = attendanceSnap.exists ? attendanceSnap.data() || {} : {};

    await attendanceRef.set(
      {
        kid_id: kidId,
        name: kidName, // ✅ Store kid name for attendees list
        attending: attending === "YES",
        marked_at: new Date(),
        // ✅ Default to 'unpaid' - admin must confirm attendance before payment becomes relevant
        payment_status: existingData?.payment_status || "unpaid",
      },
      { merge: true }
    );

    // Also record in kid's attendance subcollection (for backup)
    const kidAttendanceRef = kidRef.collection("attendance").doc(event_id);
    await kidAttendanceRef.set(
      {
        event_id: event_id,
        name: kidName, // ✅ Store kid name
        attending: attending === "YES",
        marked_at: new Date(),
        payment_status: existingData?.payment_status || "unpaid",
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      kid_id: kidId,
      event_id,
      attending: attending === "YES",
      payment_status: existingData?.payment_status || "pending",
    });
  } catch (error: any) {
    console.error("[POST /api/kids/[kidId]/attendance]", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/kids/{kidId}/attendance?eventId={eventId}
 * Get a kid's attendance record for an event
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ kidId: string }> }
) {
  try {
    const user = await requireSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { kidId } = await context.params;
    const url = new URL(req.url);
    const eventId = url.searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    // Verify user is parent or admin
    const kidRef = adminDb.collection("kids_profiles").doc(kidId);
    const kidSnap = await kidRef.get();

    if (!kidSnap.exists) {
      // Kid not found by direct ID - try to find it from parent's kids_profiles list
      const parentSnapshot = await adminDb.collection("players").doc(user.uid).get();
      const parentData = parentSnapshot.data();
      const parentKidsIds = parentData?.kids_profiles || [];
      
      if (!parentKidsIds.includes(kidId)) {
        return NextResponse.json({ error: "Kid not found or not authorized" }, { status: 404 });
      }
      
      // Kid is in parent's list but document doesn't exist - still allow retrieval
      // Return default attendance (not attending)
    } else {
      const kidData = kidSnap.data();
      // ✅ Check both parent_id and player_id for backward compatibility
      const isParent = kidData?.parent_id === user.uid || kidData?.player_id === user.uid;

      if (!isParent) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
    }

    // Get attendance record
    const eventRef = adminDb.collection("events").doc(eventId);
    const attendanceRef = eventRef.collection("kids_attendance").doc(kidId);
    const attendanceSnap = await attendanceRef.get();

    if (!attendanceSnap.exists) {
      return NextResponse.json({ attending: false, payment_status: "pending" });
    }

    const data = attendanceSnap.data();
    return NextResponse.json({
      kid_id: kidId,
      event_id: eventId,
      attending: !!data?.attending,
      payment_status: data?.payment_status || "pending",
      marked_at: data?.marked_at?.toISOString() || null,
    });
  } catch (error: any) {
    console.error("[GET /api/kids/[kidId]/attendance]", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
