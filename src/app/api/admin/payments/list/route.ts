import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminUser } from "@/lib/requireAdmin";
import { isBillable } from "@/lib/attendance";

type Status = "paid" | "pending" | "unpaid" | "rejected";
type EventType = "adults" | "kids";
type TypeFilter = "all" | "adults" | "kids";

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

function monthKeyFromIso(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function matchesMonthFilter(eventIso: string | null, monthFilter: string): boolean {
  if (!monthFilter || monthFilter === "all") return true;
  const k = monthKeyFromIso(eventIso);
  return k === monthFilter;
}

function matchesSearch(profileText: string, eventTitle: string, q: string): boolean {
  if (!q) return true;
  const s = q.toLowerCase();
  return profileText.toLowerCase().includes(s) || (eventTitle || "").toLowerCase().includes(s);
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
    const monthFilter = searchParams.get("month") || "all";
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

    // Base dataset (applies global filters: type/month/search)
    // Stats are computed from this
    const basePayments: AdminPaymentItem[] = [];

    // Billable unpaid ids (used for unpaid semantics in both stats and unpaid list)
    const billableUnpaidIds = new Set<string>();

    // Adults — collectionGroup("attendees")
    if (typeFilter !== "kids") {
      const snap = await adminDb.collectionGroup("attendees").get();

      for (const doc of snap.docs) {
        const data = doc.data();
        const eventId = doc.ref.parent.parent?.id;
        if (!eventId) continue;

        const event = events.get(eventId);
        if (!event || event.kids_event === true) continue;

        const eventIso = toIso(event.starts_at);
        if (!matchesMonthFilter(eventIso, monthFilter)) continue;

        const status: Status = normStatus(data.paid_status || data.payment_status);
        const billable = isBillable(data);

        const playerId = doc.id;
        const name: string =
          data.name || players.get(playerId)?.name || players.get(playerId)?.email || "Unknown Player";

        if (!matchesSearch(name, String(event.title || ""), searchQuery)) continue;

        const item: AdminPaymentItem = {
          id: `${eventId}_${playerId}`,
          event_id: eventId,
          event_name: event.title || "Unknown Event",
          event_date: eventIso,
          event_type: "adults",
          profile_id: playerId,
          profile_name: name,
          amount: Number(data.fee_due ?? event.fee ?? 0),
          status,
          marked_at: toIso(data.marked_at),
          confirmed_at: toIso(data.confirmed_at),
          confirmed_by: data.confirmed_by,
        };

        basePayments.push(item);

        // Stats semantics: count unpaid only if billable
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

        const eventIso = toIso(event.starts_at);
        if (!matchesMonthFilter(eventIso, monthFilter)) continue;

        const status: Status = normStatus(data.payment_status || data.paid_status);
        const billable = isBillable(data);

        const kidId = doc.id;
        const kid = kids.get(kidId);
        const kidName: string = kid?.name || "Unknown Kid";
        const parentId: string | undefined = kid?.parent_id || kid?.player_id;
        const parentName: string | undefined = parentId
          ? players.get(parentId)?.name || players.get(parentId)?.email
          : undefined;

        // Search over kid + parent + event title
        const profileText = `${kidName} ${parentName || ""}`.trim();
        if (!matchesSearch(profileText, String(event.title || ""), searchQuery)) continue;

        const item: AdminPaymentItem = {
          id: `${eventId}_${kidId}`,
          event_id: eventId,
          event_name: event.title || "Unknown Event",
          event_date: eventIso,
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

        basePayments.push(item);

        // Stats semantics: count unpaid only if billable
        if (billable && status === "unpaid") billableUnpaidIds.add(item.id);
      }
    }

    // Sort base dataset
    const priority: Record<Status, number> = { pending: 0, unpaid: 1, paid: 2, rejected: 3 };

    basePayments.sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
      const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return priority[a.status] - priority[b.status];
    });

    // Stats must be computed from base dataset (NOT status-tab filtered list)
    const stats = {
      total: basePayments.length,
      pending: basePayments.filter((p) => p.status === "pending").length,
      paid: basePayments.filter((p) => p.status === "paid").length,
      rejected: basePayments.filter((p) => p.status === "rejected").length,
      // Billable unpaid semantics
      unpaid: billableUnpaidIds.size,
      totalAmount: basePayments.reduce((s, p) => s + (p.amount || 0), 0),
      pendingAmount: basePayments
        .filter((p) => p.status === "pending")
        .reduce((s, p) => s + (p.amount || 0), 0),
      paidAmount: basePayments
        .filter((p) => p.status === "paid")
        .reduce((s, p) => s + (p.amount || 0), 0),
    };

    // Tab filter applies ONLY to list output
    const payments =
      statusFilter === "all"
        ? basePayments
        : statusFilter === "unpaid"
          ? basePayments.filter((p) => p.status === "unpaid" && billableUnpaidIds.has(p.id))
          : basePayments.filter((p) => p.status === statusFilter);

    return NextResponse.json({ success: true, payments, stats });
  } catch (e) {
    console.error("GET /api/admin/payments/list:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
