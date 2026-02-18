import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { deriveCategory } from "@/lib/deriveCategory";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await requireSessionUser();
    const { searchParams } = new URL(req.url);
    
    // Player document ID is the Firebase UID
    const playerRef = adminDb.collection("players").doc(sessionUser.uid);
    const playerSnap = await playerRef.get();
    
    if (!playerSnap.exists) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    
    const playerData = playerSnap.data() || {};
    const me = { 
      player_id: sessionUser.uid,
      ...playerData 
    };
    
    const rawProfileId = searchParams.get("profile_id");
    const linkedYouthId = searchParams.get("linked_youth_id");
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    // Resolve the effective profileId and profile type
    let profileId = me.player_id;
    let isKidProfile = false;
    let youthPlayerData: any = null;

    if (rawProfileId) {
      // Dependent kid — validate ownership
      const kidDoc = await adminDb.collection("kids_profiles").doc(rawProfileId).get();
      const kidData = kidDoc.data();
      const isParent = kidData?.parent_id === me.player_id || kidData?.player_id === me.player_id;
      if (!kidDoc.exists || !isParent) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      profileId = rawProfileId;
      isKidProfile = true;
    } else if (linkedYouthId) {
      // Linked youth full player account — validate it belongs to this parent
      const linkedYouthIds: string[] = (playerData.linked_youth as string[]) || [];
      if (!linkedYouthIds.includes(linkedYouthId)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      const youthSnap = await adminDb.collection("players").doc(linkedYouthId).get();
      if (!youthSnap.exists || youthSnap.data()?.status !== "active") {
        return NextResponse.json({ error: "Youth account not found or inactive" }, { status: 404 });
      }
      profileId = linkedYouthId;
      youthPlayerData = youthSnap.data();
    }

    // Derive groups for event filtering — use youth's own groups when applicable
    const effectivePlayerData = youthPlayerData || me;
    const playerCategory = deriveCategory(
      (effectivePlayerData as any).gender,
      (effectivePlayerData as any).hasPaymentManager,
      (effectivePlayerData as any).group,
      (effectivePlayerData as any).groups
    );
    const playerGroups = Array.isArray((effectivePlayerData as any).groups) ? (effectivePlayerData as any).groups : [];

    // Helper to convert Firestore timestamp to Date
    function toDate(val: any): Date {
      if (!val) return new Date(0);
      if (typeof val.toDate === "function") return val.toDate();
      return new Date(val);
    }

    // Fetch all events for the year
    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${parseInt(year) + 1}-01-01T00:00:00Z`);

    // All events (including kids events) are in the 'events' collection
    const eventsSnapshot = await adminDb
      .collection("events")
      .where("starts_at", ">=", startOfYear)
      .where("starts_at", "<", endOfYear)
      .get();
    
    // Filter events based on profile type and targetGroups
    const filteredDocs = eventsSnapshot.docs.filter(doc => {
      const event = doc.data();
      
      // Kids: only kids events
      if (isKidProfile) {
        return event.kids_event === true;
      }
      
      // Adults: exclude kids events
      if (event.kids_event === true) {
        return false;
      }
      
      // Check if player's groups match event's targetGroups
      const targetGroups = event.targetGroups || [];
      
      return playerGroups.some((pg: string) => 
        targetGroups.some((tg: string) => 
          String(pg || "").toLowerCase() === String(tg || "").toLowerCase()
        )
      );
    });

    // Payment stats
    let totalPaid = 0;
    let totalPending = 0;
    let eventsPaid = 0;
    let eventsPending = 0;
    
    // Monthly breakdown
    const monthlyStats: Record<string, { paid: number; pending: number }> = {};
    
    // Initialize all months
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${year}-${m.toString().padStart(2, "0")}`;
      monthlyStats[monthKey] = { paid: 0, pending: 0 };
    }

    // Event-wise breakdown
    const eventBreakdown: Array<{
      event_id: string;
      event_name: string;
      event_date: string;
      amount: number;
      paid_status: string;
    }> = [];

    // Process each event
    for (const doc of filteredDocs) {
      const event = doc.data();
      const eventId = doc.id;
      
      // Skip cancelled events
      if (event.status === "cancelled") continue;

      // Check if profile is registered for this event
      // For kids use kids_attendance subcollection, for adults use attendees
      const attendanceCollection = isKidProfile ? "kids_attendance" : "attendees";
      const attendeeDoc = await adminDb
        .collection("events")
        .doc(eventId)
        .collection(attendanceCollection)
        .doc(profileId)
        .get();

      if (attendeeDoc.exists) {
        const attendeeData = attendeeDoc.data();
        const eventCost = event.fee || event.cost || 0;
        // Kids use payment_status, adults use paid_status
        // Normalize to uppercase for comparison
        const rawStatus = attendeeData?.paid_status || attendeeData?.payment_status || "NOT_PAID";
        const paidStatus = String(rawStatus).toUpperCase();
        
        // Extract month from starts_at
        const eventDate = toDate(event.starts_at);
        const eventDateStr = eventDate.toISOString().split("T")[0];
        const monthKey = `${eventDate.getFullYear()}-${(eventDate.getMonth() + 1).toString().padStart(2, "0")}`;
        
        // Add to event breakdown
        eventBreakdown.push({
          event_id: eventId,
          event_name: event.title || event.name || "Unnamed Event",
          event_date: eventDateStr,
          amount: eventCost,
          paid_status: paidStatus,
        });

        // Calculate payment stats
        // Firestore uses: PAID, CONFIRMED for paid status
        if (paidStatus === "PAID" || paidStatus === "CONFIRMED") {
          totalPaid += eventCost;
          eventsPaid++;
          if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].paid += eventCost;
          }
        } else if (paidStatus === "PENDING") {
          totalPending += eventCost;
          eventsPending++;
          if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].pending += eventCost;
          }
        } else {
          // NOT_PAID or REJECTED
          totalPending += eventCost;
          eventsPending++;
          if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].pending += eventCost;
          }
        }
      }
    }

    // Convert monthly stats to array
    const monthly = Object.entries(monthlyStats)
      .map(([month, data]) => ({
        month,
        paid: data.paid,
        pending: data.pending,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Sort event breakdown by date (most recent first)
    eventBreakdown.sort((a, b) => b.event_date.localeCompare(a.event_date));

    // Get available years
    const latestYear = new Date().getFullYear();
    const availableYears = [];
    for (let y = latestYear; y >= latestYear - 2; y--) {
      availableYears.push(y);
    }

    return NextResponse.json({
      summary: {
        total_paid: totalPaid,
        total_pending: totalPending,
        events_paid: eventsPaid,
        events_pending: eventsPending,
      },
      monthly,
      event_breakdown: eventBreakdown.slice(0, 20), // Last 20 events
      available_years: availableYears,
      profile_id: profileId,
      year: parseInt(year),
    });
  } catch (error: any) {
    console.error("Stats payments error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment stats" },
      { status: 500 }
    );
  }
}
