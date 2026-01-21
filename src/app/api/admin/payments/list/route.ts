import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminUser } from "@/lib/requireAdmin";
import { isBillable } from "@/lib/attendance";

type Status = "paid" | "pending" | "unpaid" | "rejected";
type EventType = "adults" | "kids";

function toIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return null;
}

function normStatus(v: any): Status {
  const s = String(v || "").toLowerCase();
  if (s === "paid" || s === "pending" || s === "unpaid" || s === "rejected") return s as Status;
  return "unpaid";
}

export interface AdminPaymentItem {
  id: string;
  event_id: string;
  event_name: string;
  event_date: string | null;
  event_type: EventType;
  profile_id: string;
  profile_name: string;
  parent_id?: string;
  parent_name?: string;
  amount: number;
  status: Status;
  marked_at: string | null;
  confirmed_at: string | null;
  confirmed_by?: string;
}

type TypeFilter = "all" | "adults" | "kids";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    const statusFilter = (searchParams.get("status") || "all") as "all" | Status;
    const typeFilter = (searchParams.get("type") || "all") as TypeFilter;
    const searchQuery = searchParams.get("search")?.toLowerCase().trim() || "";

    // Load events once
    const eventsSnap = await adminDb.collection("events").get();
    const events = new Map<string, any>();
    eventsSnap.forEach((doc) => events.set(doc.id, { id: doc.id, ...doc.data() }));

    // Load profiles once
    const [playersSnap, kidsSnap] = await Promise.all([
      adminDb.collection("players").get(),
      adminDb.collection("kids_profiles").get(),
    ]);

    const players = new Map<string, any>();
    playersSnap.forEach((d) => players.set(d.id, { id: d.id, ...d.data() }));

    const kids = new Map<string, any>();
    kidsSnap.forEach((d) => kids.set(d.id, { id: d.id, ...d.data() }));

    const payments: AdminPaymentItem[] = [];
    const billableUnpaidIds = new Set<string>(); // Phase-2 unpaid semantics for stats

    // Adults — collectionGroup("attendees")
    if (typeFilter !== "kids") {
      const snap = await adminDb.collectionGroup("attendees").get();

      for (const doc of snap.docs) {
        const data = doc.data();
        const eventId = doc.ref.parent.parent?.id;
        if (!eventId) continue;

        const event = events.get(eventId);
        if (!event || event.kids_event === true) continue;

        const status: Status = normStatus(data.paid_status || data.payment_status);
        const billable = isBillable(data);

        // Phase-1 list semantics: Unpaid list only shows billable
        if (statusFilter === "unpaid" && !billable) continue;
        if (statusFilter !== "all" && status !== statusFilter) continue;

        const playerId = doc.id;
        const name: string =
          data.name || players.get(playerId)?.name || players.get(playerId)?.email || "Unknown Player";

        if (searchQuery) {
          const matchesName = name.toLowerCase().includes(searchQuery);
          const matchesEvent = String(event.title || "").toLowerCase().includes(searchQuery);
          if (!matchesName && !matchesEvent) continue;
        }

        const item: AdminPaymentItem = {
          id: `${eventId}_${playerId}`,
          event_id: eventId,
          event_name: event.title || "Unknown Event",
          event_date: toIso(event.starts_at),
          event_type: "adults",
          profile_id: playerId,
          profile_name: name,
          amount: Number(data.fee_due ?? event.fee ?? 0),
          status,
          marked_at: toIso(data.marked_at),
          confirmed_at: toIso(data.confirmed_at),
          confirmed_by: data.confirmed_by,
        };

        payments.push(item);

        // Phase-2 stats: count unpaid only if billable
        if (billable && status === "unpaid") billableUnpaidIds.add(item.id);
      }
    }

    // Kids — collectionGroup("kids_attendance")
    if (typeFilter !== "adults") {
      const snap = await adminDb.collectionGroup("kids_attendance").get();

      for (const doc of snap.docs) {
        const data = doc.data();
        const eventId = doc.ref.parent.parent?.id;
        if (!eventId) continue;

        const event = events.get(eventId);
        if (!event || event.kids_event !== true) continue;

        const status: Status = normStatus(data.payment_status || data.paid_status);
        const billable = isBillable(data);

        // Phase-1 list semantics: Unpaid list only shows billable
        if (statusFilter === "unpaid" && !billable) continue;
        if (statusFilter !== "all" && status !== statusFilter) continue;

        const kidId = doc.id;
        const kid = kids.get(kidId);
        const kidName: string = kid?.name || "Unknown Kid";
        const parentId: string | undefined = kid?.parent_id || kid?.player_id;
        const parentName: string | undefined = parentId ? (players.get(parentId)?.name || players.get(parentId)?.email) : undefined;

        if (searchQuery) {
          const matchesKid = kidName.toLowerCase().includes(searchQuery);
          const matchesParent = (parentName || "").toLowerCase().includes(searchQuery);
          const matchesEvent = String(event.title || "").toLowerCase().includes(searchQuery);
          if (!matchesKid && !matchesParent && !matchesEvent) continue;
        }

        const item: AdminPaymentItem = {
          id: `${eventId}_${kidId}`,
          event_id: eventId,
          event_name: event.title || "Unknown Event",
          event_date: toIso(event.starts_at),
          event_type: "kids",
          profile_id: kidId,
          profile_name: kidName,
          parent_id: parentId,
          parent_name: parentName,
          amount: Number(data.fee_due ?? event.fee ?? 0),
          status,
          marked_at: toIso(data.marked_at),
          confirmed_at: toIso(data.confirmed_at),
          confirmed_by: data.confirmed_by,
        };

        payments.push(item);

        // Phase-2 stats: count unpaid only if billable
        if (billable && status === "unpaid") billableUnpaidIds.add(item.id);
      }
    }

    // Sort (typed)
    const priority: Record<Status, number> = { pending: 0, unpaid: 1, paid: 2, rejected: 3 };

    payments.sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
      const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return priority[a.status] - priority[b.status];
    });

    // Stats
    const stats = {
      total: payments.length,
      pending: payments.filter((p) => p.status === "pending").length,
      paid: payments.filter((p) => p.status === "paid").length,
      rejected: payments.filter((p) => p.status === "rejected").length,
      // Phase-2 semantics: billable unpaid
      unpaid: billableUnpaidIds.size,
      totalAmount: payments.reduce((s, p) => s + (p.amount || 0), 0),
      pendingAmount: payments.filter((p) => p.status === "pending").reduce((s, p) => s + (p.amount || 0), 0),
      paidAmount: payments.filter((p) => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0),
    };

    return NextResponse.json({ success: true, payments, stats });
  } catch (e) {
    console.error("GET /api/admin/payments/list:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
