import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { isAttended, isBillable } from "@/lib/attendance";

type Status = "paid" | "pending" | "unpaid" | "rejected";

function toIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return null;
}

function normStatus(v: any): Status {
  const s = String(v || "").toUpperCase();
  // Firestore uses: PAID, CONFIRMED, PENDING, NOT_PAID, REJECTED
  if (s === "PAID" || s === "CONFIRMED") return "paid";
  if (s === "PENDING") return "pending";
  if (s === "REJECTED") return "rejected";
  return "unpaid";
}

function isFailedPrecondition(e: any): boolean {
  return e?.code === 9 || String(e?.message || "").includes("FAILED_PRECONDITION");
}

async function getAttendanceDocsForPlayer(uid: string) {
  try {
    const snap = await adminDb.collectionGroup("attendees").where("player_id", "==", uid).get();
    return snap.docs;
  } catch (e: any) {
    if (!isFailedPrecondition(e)) throw e;
    // Fallback: scan (dev-safe, prod should add index)
    const snap = await adminDb.collectionGroup("attendees").get();
    return snap.docs.filter((d) => d.data()?.player_id === uid);
  }
}

async function getAttendanceDocsForKid(kidId: string) {
  try {
    const snap = await adminDb.collectionGroup("kids_attendance").where("player_id", "==", kidId).get();
    return snap.docs;
  } catch (e: any) {
    if (!isFailedPrecondition(e)) throw e;
    const snap = await adminDb.collectionGroup("kids_attendance").get();
    // fallback supports either schema: player_id == kidId OR doc.id == kidId
    return snap.docs.filter((d) => d.data()?.player_id === kidId || d.id === kidId);
  }
}

/**
 * GET /api/payments/summary
 *
 * Query Parameters:
 * - profile: "all" | playerId | kidId
 * - status: "all" | "paid" | "pending" | "unpaid" | "rejected"
 * - dateFrom/dateTo: optional ISO range
 * - sort/order: optional
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireSessionUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const profileFilter = searchParams.get("profile") || "all";
    const statusFilter = (searchParams.get("status") || "all") as "all" | Status;
    const dateFromStr = searchParams.get("dateFrom");
    const dateToStr = searchParams.get("dateTo");
    const sortBy = searchParams.get("sort") || "date";
    const sortOrder = searchParams.get("order") || "desc";

    const dateFrom = dateFromStr ? new Date(dateFromStr) : new Date(new Date().getFullYear(), 0, 1);
    const dateTo = dateToStr ? new Date(dateToStr) : new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    // Player profile
    const playerSnap = await adminDb.collection("players").doc(user.uid).get();
    if (!playerSnap.exists) return NextResponse.json({ error: "Player not found" }, { status: 404 });

    const playerData = playerSnap.data() || {};
    const playerName = playerData.name || "You";

    // Kids (backward compatible)
    const [kidsSnap1, kidsSnap2] = await Promise.all([
      adminDb.collection("kids_profiles").where("parent_id", "==", user.uid).get(),
      adminDb.collection("kids_profiles").where("player_id", "==", user.uid).get(),
    ]);

    const kidsMap = new Map<string, any>();
    kidsSnap1.forEach((doc) =>
      kidsMap.set(doc.id, { kid_id: doc.id, ...doc.data(), name: doc.data().name || "Unknown Kid" })
    );
    kidsSnap2.forEach((doc) => {
      if (!kidsMap.has(doc.id)) kidsMap.set(doc.id, { kid_id: doc.id, ...doc.data(), name: doc.data().name || "Unknown Kid" });
    });
    const kids = Array.from(kidsMap.values());

    const profiles = [
      { profile_id: user.uid, profile_name: playerName, type: "player" as const },
      ...kids.map((k) => ({ profile_id: k.kid_id, profile_name: k.name, type: "kid" as const })),
    ];

    const activeProfiles = profileFilter === "all" ? profiles : profiles.filter((p) => p.profile_id === profileFilter);

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

    // Events once (join)
    const eventsSnap = await adminDb.collection("events").get();
    const eventsMap = new Map<string, any>();
    eventsSnap.forEach((doc) => eventsMap.set(doc.id, { event_id: doc.id, ...doc.data() }));

    const allPayments: any[] = [];

    for (const profile of activeProfiles) {
      if (profile.type === "player") {
        const docs = await getAttendanceDocsForPlayer(user.uid);

        for (const doc of docs) {
          const attendance = doc.data() || {};
          const eventId = doc.ref.parent.parent?.id;
          if (!eventId) continue;

          const event = eventsMap.get(eventId);
          if (!event || event.kids_event === true) continue;

          const eventDateIso = toIso(event.starts_at);
          const eventDate = new Date(eventDateIso || 0);
          if (eventDate < dateFrom || eventDate > dateTo) continue;

          const status: Status = normStatus(attendance.paid_status || attendance.payment_status);

          // Billable is now strictly admin-confirmed attendance (attended === true)
          const billable = isBillable(attendance);

          // "Unpaid" list should only show billable unpaid (confirmed attendance)
          if (statusFilter === "unpaid" && !billable) continue;
          if (statusFilter !== "all" && status !== statusFilter) continue;

          allPayments.push({
            event_id: eventId,
            event_name: event.title || "Unknown Event",
            event_date: eventDateIso,
            profile_id: profile.profile_id,
            profile_name: profile.profile_name,
            profile_type: "player",
            amount: Number(attendance.fee_due ?? event.fee ?? 0),
            status,

            // IMPORTANT: This must match the Home page meaning (admin-confirmed attendance)
            attended: isAttended(attendance),

            marked_at: toIso(attendance.marked_at),
            confirmed_at: toIso(attendance.confirmed_at),
            fee_due: attendance.fee_due ? Number(attendance.fee_due) : null,
            billable,
          });
        }
      } else {
        const kidId = profile.profile_id;
        const docs = await getAttendanceDocsForKid(kidId);

        for (const doc of docs) {
          const attendance = doc.data() || {};
          const eventId = doc.ref.parent.parent?.id;
          if (!eventId) continue;

          const event = eventsMap.get(eventId);
          if (!event || event.kids_event !== true) continue;

          const eventDateIso = toIso(event.starts_at);
          const eventDate = new Date(eventDateIso || 0);
          if (eventDate < dateFrom || eventDate > dateTo) continue;

          const status: Status = normStatus(attendance.payment_status || attendance.paid_status);
          const billable = isBillable(attendance);

          if (statusFilter === "unpaid" && !billable) continue;
          if (statusFilter !== "all" && status !== statusFilter) continue;

          allPayments.push({
            event_id: eventId,
            event_name: event.title || "Unknown Event",
            event_date: eventDateIso,
            profile_id: profile.profile_id,
            profile_name: profile.profile_name,
            profile_type: "kid",
            amount: Number(attendance.fee_due ?? event.fee ?? 0),
            status,

            // IMPORTANT: Match Home meaning
            attended: isAttended(attendance),

            marked_at: toIso(attendance.marked_at),
            confirmed_at: toIso(attendance.confirmed_at),
            fee_due: attendance.fee_due ? Number(attendance.fee_due) : null,
            billable,
          });
        }
      }
    }

    // Sort
    allPayments.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "amount") cmp = (a.amount || 0) - (b.amount || 0);
      else if (sortBy === "status") cmp = String(a.status).localeCompare(String(b.status));
      else cmp = new Date(a.event_date || 0).getTime() - new Date(b.event_date || 0).getTime();
      return sortOrder === "desc" ? -cmp : cmp;
    });

    // Summary totals (unpaid only when billable)
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

    for (const p of allPayments) {
      const amount = Number(p.amount || 0);
      if (p.status === "paid") {
        summary.total_paid += amount;
        summary.count_paid++;
      } else if (p.status === "pending") {
        summary.total_pending += amount;
        summary.count_pending++;
      } else if (p.status === "rejected") {
        summary.total_rejected += amount;
        summary.count_rejected++;
      } else {
        if (p.billable) {
          summary.total_unpaid += amount;
          summary.count_unpaid++;
        }
      }
    }

    return NextResponse.json({ success: true, summary, payments: allPayments }, { status: 200 });
  } catch (error) {
    console.error("GET /api/payments/summary:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
