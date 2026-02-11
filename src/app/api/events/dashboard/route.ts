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

function normAttending(v: any): "YES" | "NO" | "UNKNOWN" {
  // Handle boolean values (kids attendance stores as boolean)
  if (v === true) return "YES";
  if (v === false) return "NO";
  // Handle string values
  const s = String(v || "").toUpperCase();
  if (s === "YES" || s === "NO") return s as any;
  return "UNKNOWN";
}

function normPaid(v: any): "UNPAID" | "PENDING" | "PAID" | "REJECTED" {
  const s = String(v || "").toUpperCase();
  if (s === "PAID" || s === "PENDING" || s === "REJECTED") return s as any;
  return "UNPAID";
}

/**
 * GET /api/events/dashboard
 * 
 * Returns the next upcoming event and the last past event for the current user
 * Used for the player home dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId"); // Optional: for kid profiles
    
    const now = new Date();
    const nowIso = now.toISOString();

    // Get user's profile to determine group (prefer 'players', fallback to 'profiles')
    let profileData: { group?: string; name?: string; email?: string } = {};
    let userGroup = "men";
    let playerSnap = await adminDb.collection("players").doc(user.uid).get();
    if (playerSnap.exists) {
      profileData = (playerSnap.data() || {}) as { group?: string; name?: string; email?: string };
      userGroup = profileData.group || "men";
    } else {
      const profileSnap = await adminDb.collection("profiles").doc(user.uid).get();
      profileData = (profileSnap.data() || {}) as { group?: string; name?: string; email?: string };
      userGroup = profileData.group || "men";
    }

    // Get upcoming events (next 30 days)
    const futureLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get past events (last 30 days)
    const pastLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all events
    const eventsSnap = await adminDb
      .collection("events")
      .orderBy("starts_at", "asc")
      .get();

    let nextEvent: any = null;
    let lastEvent: any = null;
    let upcomingEvents: any[] = []; // Array to hold next 7 upcoming events

    for (const doc of eventsSnap.docs) {
      const data = doc.data();
      const eventDate = toIso(data.starts_at);
      if (!eventDate) continue;

      const isKidsEvent = data.kids_event === true;
      
      // Filter based on profile type
      if (kidId) {
        // For kid profiles, only show kids events
        if (!isKidsEvent) continue;
      } else {
        // For adult profiles, only show adult events matching their group
        if (isKidsEvent) continue;
        if (data.group && data.group !== "all" && data.group !== userGroup) continue;
      }

      // Skip cancelled events
      if (data.status === "cancelled") continue;

      const eventObj = {
        event_id: doc.id,
        title: data.title || "Untitled Event",
        event_type: data.event_type || "other",
        starts_at: eventDate,
        location: data.location || "",
        fee: Number(data.fee || 0),
        status: data.status || "scheduled",
        group: data.group || "all",
        kids_event: isKidsEvent,
        my: {
          attending: "UNKNOWN" as "YES" | "NO" | "UNKNOWN",
          attended: false,
          paid_status: "UNPAID" as "UNPAID" | "PENDING" | "PAID" | "REJECTED",
          fee_due: null as number | null,
        },
      };

      // Get user's attendance for this event
      if (kidId) {
        const attendanceSnap = await adminDb
          .collection("events")
          .doc(doc.id)
          .collection("kids_attendance")
          .doc(kidId)
          .get();

        if (attendanceSnap.exists) {
          const attData = attendanceSnap.data() || {};
          eventObj.my = {
            attending: normAttending(attData.attending),
            attended: !!attData.attended,
            paid_status: normPaid(attData.payment_status),
            fee_due: attData.fee_due ?? null,
          };
        }
      } else {
        const attendanceSnap = await adminDb
          .collection("events")
          .doc(doc.id)
          .collection("attendees")
          .doc(user.uid)
          .get();

        if (attendanceSnap.exists) {
          const attData = attendanceSnap.data() || {};
          eventObj.my = {
            attending: normAttending(attData.attending),
            attended: !!attData.attended,
            paid_status: normPaid(attData.paid_status),
            fee_due: attData.fee_due ?? null,
          };
        }
      }

      // Categorize as next or last event
      if (eventDate > nowIso && eventDate < futureLimit) {
        // Future event - collect up to 7 upcoming events
        if (upcomingEvents.length < 7) {
          upcomingEvents.push(eventObj);
        }
        // Keep first event as nextEvent for backward compatibility
        if (!nextEvent) {
          nextEvent = eventObj;
        }
      } else if (eventDate <= nowIso && eventDate > pastLimit) {
        // Past event - take the most recent one
        lastEvent = eventObj;
      }
    }

    // Get user stats
    let eventsAttendedThisMonth = 0;
    let pendingPayments = 0;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    for (const doc of eventsSnap.docs) {
      const data = doc.data();
      const eventDate = toIso(data.starts_at);
      if (!eventDate) continue;

      const isKidsEvent = data.kids_event === true;
      
      // Filter based on profile type
      if (kidId && !isKidsEvent) continue;
      if (!kidId && isKidsEvent) continue;
      if (!kidId && data.group && data.group !== "all" && data.group !== userGroup) continue;

      // Get attendance
      const collectionName = kidId ? "kids_attendance" : "attendees";
      const profileId = kidId || user.uid;
      
      const attSnap = await adminDb
        .collection("events")
        .doc(doc.id)
        .collection(collectionName)
        .doc(profileId)
        .get();

      if (attSnap.exists) {
        const attData = attSnap.data() || {};
        const attending = normAttending(attData.attending);
        const paidStatus = normPaid(kidId ? attData.payment_status : attData.paid_status);

        // Count attended this month
        if (eventDate >= monthStart && eventDate <= monthEnd && eventDate <= nowIso) {
          if (attending === "YES") {
            eventsAttendedThisMonth++;
          }
        }

        // Count pending payments
        if (paidStatus === "PENDING") {
          pendingPayments++;
        }
      }
    }

    // Calculate friendsSummary for upcoming events (first 3 for performance)
    const eventsWithFriendsSummary = [];
    
    for (let i = 0; i < Math.min(upcomingEvents.length, 3); i++) {
      const event = upcomingEvents[i];
      let friendsSummary = undefined;

      if (event.kids_event) {
        // For kids events, get kids attendance with names
        const kidsAttendanceSnap = await adminDb
          .collection("events")
          .doc(event.event_id)
          .collection("kids_attendance")
          .get();

        const kidsYesList: { kid_id: string; name: string }[] = [];
        let totalKids = 0;

        for (const doc of kidsAttendanceSnap.docs) {
          const data = doc.data();
          totalKids++;
          const attending = normAttending(data.attending);
          if (attending === "YES") {
            const kidId = doc.id;
            // Get kid's name from kids_profiles
            const kidSnap = await adminDb.collection("kids_profiles").doc(kidId).get();
            const kidData = kidSnap.data();
            const kidName = kidData?.name || "Unknown Kid";
            kidsYesList.push({ kid_id: kidId, name: kidName });
          }
        }

        friendsSummary = {
          kids: { yes: kidsYesList.length, total: totalKids, people: kidsYesList },
        };
      } else {
        // For adult events, get attendees with names filtered by event group
        const attendeesSnap = await adminDb
          .collection("events")
          .doc(event.event_id)
          .collection("attendees")
          .get();

        const eventGroup = event.group?.toLowerCase() || "all";
        const menYesList: { player_id: string; name: string }[] = [];
        const womenYesList: { player_id: string; name: string }[] = [];
        let totalMen = 0;
        let totalWomen = 0;

        for (const doc of attendeesSnap.docs) {
          const data = doc.data();
          const attending = normAttending(data.attending);
          const playerId = doc.id;

          // Get player's data from players collection to get group (male/female) and name
          const playerSnap = await adminDb.collection("players").doc(playerId).get();
          const playerData = playerSnap.data();
          const playerName = playerData?.name || "Unknown Player";
          // Use group field from player profile to determine gender
          const playerGroup = playerData?.group?.toLowerCase() || "all";
          const isMale = playerGroup === "men";

          if (isMale) {
            const isMaleGroup = eventGroup === "all" || eventGroup === "men" || eventGroup === "mixed";
            if (isMaleGroup) {
              totalMen++;
              if (attending === "YES") {
                menYesList.push({ player_id: playerId, name: playerName });
              }
            }
          } else {
            const isFemaleGroup = eventGroup === "all" || eventGroup === "women" || eventGroup === "mixed";
            if (isFemaleGroup) {
              totalWomen++;
              if (attending === "YES") {
                womenYesList.push({ player_id: playerId, name: playerName });
              }
            }
          }
        }

        friendsSummary = {
          men: { yes: menYesList.length, total: totalMen, people: menYesList },
          women: { yes: womenYesList.length, total: totalWomen, people: womenYesList },
        };
      }

      eventsWithFriendsSummary.push({ ...event, friendsSummary });
    }

    // Add remaining events without friends summary (for performance)
    for (let i = 3; i < upcomingEvents.length; i++) {
      eventsWithFriendsSummary.push(upcomingEvents[i]);
    }

    // For backward compatibility, add friends summary to nextEvent if it exists
    const nextEventWithFriends = eventsWithFriendsSummary.length > 0 ? eventsWithFriendsSummary[0] : null;

    return NextResponse.json({
      success: true,
      nextEvent: nextEventWithFriends, // Keep for backward compatibility
      upcomingEvents: eventsWithFriendsSummary, // New array of upcoming events
      lastEvent,
      stats: {
        eventsAttendedThisMonth,
        pendingPayments,
      },
      profile: {
        name: profileData.name || user.email,
        group: userGroup,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("GET /api/events/dashboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
