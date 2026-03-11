import { adminDb } from "./firebaseAdmin";
import { deriveCategory } from "./deriveCategory";

function normAttending(v: any) {
  const s = String(v || "").toUpperCase();
  if (s === "YES" || s === "NO") return s;
  return "UNKNOWN";
}

/**
 * Returns a lean summary of YES-count per target group for an event.
 * Only used for the summary line displayed on each event card (pre-loaded with the events list).
 * Full modal data (incl. absent) is fetched on-demand by FriendsGoingModal itself.
 *
 * Returns: Record<string, { yes: number }>
 * e.g.  { "Men": { yes: 9 }, "U-15": { yes: 4 } }
 */
export async function getFriendsSummaryForEvent(
  event: any
): Promise<Record<string, { yes: number }> | undefined> {
  if (!event) return undefined;

  const eventId = event.event_id || event.id;
  if (!eventId) return undefined;

  const eventTargetGroups: string[] = Array.isArray(event.targetGroups)
    ? event.targetGroups
    : [];

  // ── Kids events ────────────────────────────────────────────────────────────
  if (event.kids_event) {
    const kidsSnap = await adminDb
      .collection("events")
      .doc(eventId)
      .collection("kids_attendance")
      .get();

    let kidsYes = 0;
    for (const doc of kidsSnap.docs) {
      if (normAttending(doc.data().attending) === "YES") kidsYes++;
    }
    return { Kids: { yes: kidsYes } };
  }

  // ── Adult events ───────────────────────────────────────────────────────────
  const attSnap = await adminDb
    .collection("events")
    .doc(eventId)
    .collection("attendees")
    .get();

  // Initialise result buckets
  const result: Record<string, { yes: number }> =
    eventTargetGroups.length > 0
      ? Object.fromEntries(eventTargetGroups.map((tg) => [tg, { yes: 0 }]))
      : { Men: { yes: 0 }, Women: { yes: 0 } };

  if (attSnap.empty) return result;

  // Batch-fetch player docs (avoids N+1 queries)
  const attendeeIds = attSnap.docs.map((d) => d.id);
  const playerRefs = attendeeIds.map((id) =>
    adminDb.collection("players").doc(id)
  );
  const playerSnaps = await adminDb.getAll(...playerRefs);

  const playersById = new Map<string, any>();
  playerSnaps.forEach((snap) => {
    if (snap.exists) playersById.set(snap.id, snap.data());
  });

  for (const doc of attSnap.docs) {
    if (normAttending(doc.data().attending) !== "YES") continue;

    const pd = playersById.get(doc.id);
    if (!pd) continue;

    if (eventTargetGroups.length > 0) {
      const playerGroups: string[] = Array.isArray(pd.groups) ? pd.groups : [];
      for (const tg of eventTargetGroups) {
        if (playerGroups.includes(tg)) {
          result[tg].yes += 1;
        }
      }
    } else {
      // Legacy fallback — derive from gender/group
      const category = deriveCategory(
        pd.gender,
        pd.hasPaymentManager,
        pd.group,
        pd.groups
      );
      const bucket = category === "women" ? "Women" : "Men";
      if (result[bucket]) result[bucket].yes += 1;
    }
  }

  return result;
}

