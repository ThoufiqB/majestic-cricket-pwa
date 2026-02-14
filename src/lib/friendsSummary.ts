import { adminDb } from "./firebaseAdmin";
import { deriveCategory } from "./deriveCategory";

function normAttending(v: any) {
  const s = String(v || "").toUpperCase();
  if (s === "YES" || s === "NO") return s;
  return "UNKNOWN";
}

export async function getFriendsSummaryForEvent(event: any) {
  if (!event) return undefined;
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

    return {
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
      // Derive category from gender + hasPaymentManager
      const playerCategory = deriveCategory(
        playerData?.gender,
        playerData?.hasPaymentManager,
        playerData?.group  // Fallback for legacy
      );
      const isMale = playerCategory === "men";

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

    return {
      men: { yes: menYesList.length, total: totalMen, people: menYesList },
      women: { yes: womenYesList.length, total: totalWomen, people: womenYesList },
    };
  }
}
