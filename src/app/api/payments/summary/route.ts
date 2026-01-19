import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

function toIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return null;
}

function normStatus(v: any): "paid" | "pending" | "unpaid" | "rejected" {
  const s = String(v || "").toUpperCase();
  // Firestore uses: PAID, CONFIRMED, PENDING, NOT_PAID, REJECTED
  if (s === "PAID" || s === "CONFIRMED") return "paid";
  if (s === "PENDING") return "pending";
  if (s === "REJECTED") return "rejected";
  return "unpaid"; // NOT_PAID or any other status
}

/**
 * GET /api/payments/summary
 * 
 * Query Parameters:
 * - profile: "all" | playerId | kidId (filter to specific profile)
 * - status: "all" | "paid" | "pending" | "unpaid" | "rejected" (filter by status)
 * - dateFrom: ISO date string (filter events from this date)
 * - dateTo: ISO date string (filter events to this date)
 * - sort: "date" | "amount" | "status" (sort field)
 * - order: "asc" | "desc" (sort direction)
 * 
 * Returns payment summary and aggregated payments for user + kids
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authenticated
    const user = await requireSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const profileFilter = searchParams.get("profile") || "all";
    const statusFilter = searchParams.get("status") || "all";
    const dateFromStr = searchParams.get("dateFrom");
    const dateToStr = searchParams.get("dateTo");
    const sortBy = searchParams.get("sort") || "date";
    const sortOrder = searchParams.get("order") || "desc";

    // Parse dates
    const dateFrom = dateFromStr ? new Date(dateFromStr) : new Date(new Date().getFullYear(), 0, 1);
    const dateTo = dateToStr ? new Date(dateToStr) : new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    // Get user's player profile
    const playerRef = adminDb.collection("players").doc(user.uid);
    const playerSnap = await playerRef.get();

    if (!playerSnap.exists) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const playerData = playerSnap.data() || {};
    const playerName = playerData.name || "You";

    // Get user's kids from kids_profiles collection
    // Check both parent_id and player_id for backward compatibility
    const kidsSnap1 = await adminDb.collection("kids_profiles").where("parent_id", "==", user.uid).get();
    const kidsSnap2 = await adminDb.collection("kids_profiles").where("player_id", "==", user.uid).get();
    
    // Merge and dedupe kids
    const kidsMap = new Map<string, any>();
    kidsSnap1.forEach((doc) => {
      kidsMap.set(doc.id, {
        kid_id: doc.id,
        name: doc.data().name || "Unknown Kid",
        ...doc.data(),
      });
    });
    kidsSnap2.forEach((doc) => {
      if (!kidsMap.has(doc.id)) {
        kidsMap.set(doc.id, {
          kid_id: doc.id,
          name: doc.data().name || "Unknown Kid",
          ...doc.data(),
        });
      }
    });
    const kids = Array.from(kidsMap.values());

    // Collect all profiles (player + kids)
    const profiles = [
      { profile_id: user.uid, profile_name: playerName, type: "player" },
      ...kids.map((k) => ({ profile_id: k.kid_id, profile_name: k.name, type: "kid" })),
    ];

    // Filter profiles based on request
    const activeProfiles =
      profileFilter === "all" ? profiles : profiles.filter((p) => p.profile_id === profileFilter);

    if (activeProfiles.length === 0) {
      return NextResponse.json(
        {
          success: true,
          summary: {
            total_paid: 0,
            total_pending: 0,
            total_unpaid: 0,
            total_rejected: 0,
            count_paid: 0,
            count_pending: 0,
            count_unpaid: 0,
            count_rejected: 0,
          },
          payments: [],
        },
        { status: 200 }
      );
    }

    // Get all events
    const eventsSnap = await adminDb.collection("events").get();
    const eventsMap = new Map();
    eventsSnap.forEach((doc) => {
      eventsMap.set(doc.id, { event_id: doc.id, ...doc.data() });
    });

    // Collect all payments for active profiles
    const allPayments: any[] = [];

    for (const profile of activeProfiles) {
      if (profile.type === "player") {
        // Get player's attendance records for all events
        for (const [eventId, event] of eventsMap) {
          // Skip kids events for player profile
          if (event.kids_event === true) continue;

          // Check if attendance record exists - correct path is events/{eventId}/attendees/{uid}
          const attendanceRef = adminDb
            .collection("events")
            .doc(eventId)
            .collection("attendees")
            .doc(user.uid);

          const attendanceSnap = await attendanceRef.get();
          if (!attendanceSnap.exists) continue;

          const attendance = attendanceSnap.data() || {};

          // Filter by date
          const eventDate = new Date(toIso(event.starts_at) || 0);
          if (eventDate < dateFrom || eventDate > dateTo) continue;

          // Get payment status
          const status = normStatus(attendance.paid_status || attendance.payment_status);

          // Filter by status
          if (statusFilter !== "all" && status !== statusFilter) continue;

          allPayments.push({
            event_id: eventId,
            event_name: event.title || "Unknown Event",
            event_date: toIso(event.starts_at),
            profile_id: profile.profile_id,
            profile_name: profile.profile_name,
            profile_type: "player",
            amount: Number(event.fee || 0),
            cost: Number(event.cost || event.fee || 0),
            status: status,
            attended: !!attendance.attended,
            marked_at: toIso(attendance.marked_at),
            confirmed_at: toIso(attendance.confirmed_at),
            fee_due: attendance.fee_due ? Number(attendance.fee_due) : null,
          });
        }
      } else {
        // Get kid's attendance records
        const kidId = profile.profile_id;
        for (const [eventId, event] of eventsMap) {
          // Only kids events
          if (event.kids_event !== true) continue;

          // Check if attendance record exists
          const attendanceRef = adminDb
            .collection("events")
            .doc(eventId)
            .collection("kids_attendance")
            .doc(kidId);

          const attendanceSnap = await attendanceRef.get();
          if (!attendanceSnap.exists) continue;

          const attendance = attendanceSnap.data() || {};

          // Filter by date
          const eventDate = new Date(toIso(event.starts_at) || 0);
          if (eventDate < dateFrom || eventDate > dateTo) continue;

          // Get payment status
          const status = normStatus(attendance.payment_status || attendance.paid_status);

          // Filter by status
          if (statusFilter !== "all" && status !== statusFilter) continue;

          allPayments.push({
            event_id: eventId,
            event_name: event.title || "Unknown Event",
            event_date: toIso(event.starts_at),
            profile_id: profile.profile_id,
            profile_name: profile.profile_name,
            profile_type: "kid",
            amount: Number(event.fee || 0),
            cost: Number(event.cost || event.fee || 0),
            status: status,
            attended: !!attendance.attended,
            marked_at: toIso(attendance.marked_at),
            confirmed_at: toIso(attendance.confirmed_at),
            fee_due: attendance.fee_due ? Number(attendance.fee_due) : null,
          });
        }
      }
    }

    // Sort payments
    allPayments.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "amount") {
        cmp = a.amount - b.amount;
      } else if (sortBy === "status") {
        cmp = a.status.localeCompare(b.status);
      } else {
        // default: sort by date
        const dateA = new Date(a.event_date || 0).getTime();
        const dateB = new Date(b.event_date || 0).getTime();
        cmp = dateA - dateB;
      }

      return sortOrder === "desc" ? -cmp : cmp;
    });

    // Calculate summary totals
    const summary = {
      total_paid: 0,
      total_pending: 0,
      total_unpaid: 0,
      total_rejected: 0,
      count_paid: 0,
      count_pending: 0,
      count_unpaid: 0,
      count_rejected: 0,
    };

    for (const payment of allPayments) {
      const amount = payment.amount || 0;
      if (payment.status === "paid") {
        summary.total_paid += amount;
        summary.count_paid += 1;
      } else if (payment.status === "pending") {
        summary.total_pending += amount;
        summary.count_pending += 1;
      } else if (payment.status === "rejected") {
        summary.total_rejected += amount;
        summary.count_rejected += 1;
      } else {
        summary.total_unpaid += amount;
        summary.count_unpaid += 1;
      }
    }

    return NextResponse.json(
      {
        success: true,
        summary,
        payments: allPayments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/payments/summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
