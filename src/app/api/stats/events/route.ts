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
      group: playerData.group as string | undefined,
      ...playerData 
    };
    
    // Get profile_id (for kid stats) or use player's own ID
    const profileId = searchParams.get("profile_id") || me.player_id;
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    
    // Determine if we're fetching for a kid or the player
    const isKidProfile = profileId !== me.player_id;
    
    // Validate kid belongs to player
    if (isKidProfile) {
      const kidDoc = await adminDb.collection("kids_profiles").doc(profileId).get();
      const kidData = kidDoc.data();
      // Check both parent_id and player_id for backward compatibility
      const isParent = kidData?.parent_id === me.player_id || kidData?.player_id === me.player_id;
      if (!kidDoc.exists || !isParent) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Get player/kid data to determine category and groups
    let category: string;
    let userGroups: string[];
    
    if (isKidProfile) {
      // Kids always have category "juniors"
      category = "juniors";
      userGroups = ["U-13", "U-15", "U-18", "Kids"]; // All youth groups
    } else {
      // Derive category from player's gender + hasPaymentManager
      category = deriveCategory(me.gender, me.hasPaymentManager, me.group);
      userGroups = Array.isArray(me.groups) ? me.groups : [];
    }

    // Helper to convert Firestore timestamp to Date
    function toDate(val: any): Date {
      if (!val) return new Date(0);
      if (typeof val.toDate === "function") return val.toDate();
      return new Date(val);
    }

    // Fetch all events for the specified year
    // Kids events are in the same 'events' collection with kids_event=true
    const eventsCollection = "events";
    
    // Create date range for the year
    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${parseInt(year) + 1}-01-01T00:00:00Z`);
    
    // Query by starts_at timestamp
    const eventsSnapshot = await adminDb
      .collection(eventsCollection)
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
      
      // Check if player's groups overlap with event's targetGroups
      const targetGroups = event.targetGroups || [];
      
      // If no targetGroups (legacy event), try legacy group field
      if (targetGroups.length === 0) {
        const legacyGroup = String(event.group || "").toLowerCase();
        return legacyGroup === category;
      }
      
      // Check array intersection: player belongs to at least one target group
      return userGroups.some(playerGroup => 
        targetGroups.some((targetGroup: string) => 
          String(targetGroup || "").toLowerCase() === String(playerGroup || "").toLowerCase()
        )
      );
    });
    
    // Count stats
    let totalEvents = 0;
    let attendedEvents = 0;
    let missedEvents = 0;
    
    // Monthly breakdown
    const monthlyStats: Record<string, { total: number; attended: number }> = {};
    
    // Initialize all months
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${year}-${m.toString().padStart(2, "0")}`;
      monthlyStats[monthKey] = { total: 0, attended: 0 };
    }

    // Process each event
    for (const doc of filteredDocs) {
      const event = doc.data();
      const eventId = doc.id;
      
      // Skip cancelled events
      if (event.status === "cancelled") continue;
      
      totalEvents++;
      
      // Extract month from starts_at
      const eventDate = toDate(event.starts_at);
      const monthKey = `${eventDate.getFullYear()}-${(eventDate.getMonth() + 1).toString().padStart(2, "0")}`;
      
      if (monthlyStats[monthKey]) {
        monthlyStats[monthKey].total++;
      }

      // Check attendance - for kids use kids_attendance subcollection, for adults use attendees
      const attendanceCollection = isKidProfile ? "kids_attendance" : "attendees";
      const attendeeDoc = await adminDb
        .collection("events")
        .doc(eventId)
        .collection(attendanceCollection)
        .doc(profileId)
        .get();

      if (attendeeDoc.exists) {
        const attendeeData = attendeeDoc.data();
        // Check if actually attended (marked attendance AND attended)
        if (attendeeData?.attended === true) {
          attendedEvents++;
          if (monthlyStats[monthKey]) {
            monthlyStats[monthKey].attended++;
          }
        } else {
          missedEvents++;
        }
      } else {
        // Not registered at all
        missedEvents++;
      }
    }

    // Calculate rate
    const attendanceRate = totalEvents > 0 
      ? Math.round((attendedEvents / totalEvents) * 100 * 10) / 10 
      : 0;

    // Convert monthly stats to array
    const monthly = Object.entries(monthlyStats)
      .map(([month, data]) => ({
        month,
        total: data.total,
        attended: data.attended,
        rate: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Get available years (for year selector)
    const yearsSnapshot = await adminDb
      .collection("events")
      .orderBy("starts_at", "desc")
      .limit(1)
      .get();
    
    const latestYear = yearsSnapshot.empty 
      ? new Date().getFullYear() 
      : toDate(yearsSnapshot.docs[0].data().starts_at).getFullYear();
    
    const availableYears = [];
    for (let y = latestYear; y >= latestYear - 2; y--) {
      availableYears.push(y);
    }

    return NextResponse.json({
      summary: {
        total_events: totalEvents,
        attended: attendedEvents,
        missed: missedEvents,
        attendance_rate: attendanceRate,
      },
      monthly,
      available_years: availableYears,
      profile_id: profileId,
      year: parseInt(year),
    });
  } catch (error: any) {
    console.error("Stats events error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch event stats" },
      { status: 500 }
    );
  }
}
