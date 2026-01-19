import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminUser } from "@/lib/requireAdmin";

function toIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return null;
}

function normStatus(v: any): "paid" | "pending" | "unpaid" | "rejected" {
  const s = String(v || "").toLowerCase();
  if (s === "paid" || s === "pending" || s === "unpaid" || s === "rejected") return s as any;
  return "unpaid";
}

export interface AdminPaymentItem {
  id: string;
  event_id: string;
  event_name: string;
  event_date: string | null;
  event_type: "adults" | "kids";
  profile_id: string;
  profile_name: string;
  parent_id?: string;
  parent_name?: string;
  amount: number;
  status: "paid" | "pending" | "unpaid" | "rejected";
  marked_at: string | null;
  confirmed_at: string | null;
  confirmed_by?: string;
}

/**
 * GET /api/admin/payments/list
 * 
 * Query Parameters:
 * - status: "all" | "paid" | "pending" | "unpaid" | "rejected"
 * - type: "all" | "adults" | "kids"
 * - month: YYYY-MM (filter by event month)
 * - eventId: specific event ID
 * - search: name search
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "all";
    const typeFilter = searchParams.get("type") || "all";
    const monthFilter = searchParams.get("month");
    const eventIdFilter = searchParams.get("eventId");
    const searchQuery = searchParams.get("search")?.toLowerCase().trim();

    // Calculate date range from month
    let dateFrom: Date | null = null;
    let dateTo: Date | null = null;
    
    if (monthFilter) {
      const [year, month] = monthFilter.split("-").map(Number);
      dateFrom = new Date(year, month - 1, 1);
      dateTo = new Date(year, month, 0, 23, 59, 59);
    }

    // Get events (optionally filtered by month or specific event)
    let eventsQuery = adminDb.collection("events").orderBy("starts_at", "desc");
    const eventsSnap = await eventsQuery.get();
    
    const events: Map<string, any> = new Map();
    eventsSnap.forEach((doc) => {
      const data = doc.data();
      const eventDate = toIso(data.starts_at);
      
      // Filter by specific event
      if (eventIdFilter && doc.id !== eventIdFilter) return;
      
      // Filter by month
      if (dateFrom && dateTo && eventDate) {
        const date = new Date(eventDate);
        if (date < dateFrom || date > dateTo) return;
      }
      
      // Filter by type
      const isKidsEvent = data.kids_event === true;
      if (typeFilter === "adults" && isKidsEvent) return;
      if (typeFilter === "kids" && !isKidsEvent) return;
      
      events.set(doc.id, {
        id: doc.id,
        title: data.title || "Unknown Event",
        starts_at: eventDate,
        fee: Number(data.fee || 0),
        kids_event: isKidsEvent,
      });
    });

    // Get profiles and kids for name lookups
    const [profilesSnap, kidsSnap] = await Promise.all([
      adminDb.collection("players").get(),
      adminDb.collection("kids_profiles").get(),
    ]);

    const profiles: Map<string, any> = new Map();
    profilesSnap.forEach((doc) => {
      profiles.set(doc.id, { id: doc.id, name: doc.data().name || doc.data().email });
    });

    const kids: Map<string, any> = new Map();
    kidsSnap.forEach((doc) => {
      const data = doc.data();
      kids.set(doc.id, { 
        id: doc.id, 
        name: data.name || "Unknown Kid",
        parent_id: data.parent_id || data.player_id,
      });
    });

    // Collect all payments
    const payments: AdminPaymentItem[] = [];
    
    for (const [eventId, event] of events) {
      if (event.kids_event) {
        // Kids event - check kids_attendance subcollection
        const attendanceSnap = await adminDb
          .collection("events")
          .doc(eventId)
          .collection("kids_attendance")
          .get();

        for (const doc of attendanceSnap.docs) {
          const data = doc.data();
          const status = normStatus(data.payment_status || data.paid_status);
          
          // Filter by status
          if (statusFilter !== "all" && status !== statusFilter) continue;
          
          const kid = kids.get(doc.id);
          const kidName = kid?.name || "Unknown Kid";
          const parentId = kid?.parent_id;
          const parentName = parentId ? profiles.get(parentId)?.name : undefined;
          
          // Filter by search
          if (searchQuery) {
            const matchesKid = kidName.toLowerCase().includes(searchQuery);
            const matchesParent = parentName?.toLowerCase().includes(searchQuery);
            const matchesEvent = event.title.toLowerCase().includes(searchQuery);
            if (!matchesKid && !matchesParent && !matchesEvent) continue;
          }
          
          payments.push({
            id: `${eventId}_${doc.id}`,
            event_id: eventId,
            event_name: event.title,
            event_date: event.starts_at,
            event_type: "kids",
            profile_id: doc.id,
            profile_name: kidName,
            parent_id: parentId,
            parent_name: parentName,
            amount: Number(data.fee_due ?? event.fee ?? 0),
            status,
            marked_at: toIso(data.marked_at),
            confirmed_at: toIso(data.confirmed_at),
            confirmed_by: data.confirmed_by,
          });
        }
      } else {
        // Adults event - check attendees subcollection
        const attendanceSnap = await adminDb
          .collection("events")
          .doc(eventId)
          .collection("attendees")
          .get();

        for (const doc of attendanceSnap.docs) {
          const data = doc.data();
          const status = normStatus(data.paid_status || data.payment_status);

          // Filter by status
          if (statusFilter !== "all" && status !== statusFilter) continue;

          const playerId = doc.id;
          // Use name from attendee doc, fallback to player profile
          const playerName = data.name || profiles.get(playerId)?.name || "Unknown Player";

          // Filter by search - check if player name OR event matches
          if (searchQuery) {
            const matchesPlayer = playerName.toLowerCase().includes(searchQuery);
            const matchesEvent = event.title.toLowerCase().includes(searchQuery);
            // Only include if matches - if neither matches, skip
            if (!matchesPlayer && !matchesEvent) continue;
          }

          payments.push({
            id: `${eventId}_${playerId}`,
            event_id: eventId,
            event_name: event.title,
            event_date: event.starts_at,
            event_type: "adults",
            profile_id: doc.id,
            profile_name: playerName,
            amount: Number(data.fee_due ?? event.fee ?? 0),
            status,
            marked_at: toIso(data.marked_at),
            confirmed_at: toIso(data.confirmed_at),
            confirmed_by: data.confirmed_by,
          });
        }
      }
    }

    // Sort by event date (most recent first), then by status priority
    const statusPriority = { pending: 0, unpaid: 1, paid: 2, rejected: 3 };
    payments.sort((a, b) => {
      const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
      const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return statusPriority[a.status] - statusPriority[b.status];
    });

    // Calculate stats
    const stats = {
      total: payments.length,
      pending: payments.filter(p => p.status === "pending").length,
      paid: payments.filter(p => p.status === "paid").length,
      unpaid: payments.filter(p => p.status === "unpaid").length,
      rejected: payments.filter(p => p.status === "rejected").length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: payments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0),
      paidAmount: payments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0),
    };

    return NextResponse.json({
      success: true,
      payments,
      stats,
    });
  } catch (error) {
    console.error("GET /api/admin/payments/list:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
