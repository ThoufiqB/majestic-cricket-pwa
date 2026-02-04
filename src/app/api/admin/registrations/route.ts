import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/requireAdmin";
import { adminDb } from "@/lib/firebaseAdmin";
import type { RegistrationRequest, RegistrationStatus } from "@/lib/types/auth";

function toDateSafe(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  // Firestore Timestamp
  if (typeof v?.toDate === "function") return v.toDate();
  // ISO string / number
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * GET /api/admin/registrations
 * List all registration requests with optional status filter
 * Query params:
 *   - status: "pending" | "approved" | "rejected" | "all" (default: "pending")
 *   - limit: number (default: 50)
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "50");

    let query;

    // Apply status filter if not "all"
    if (statusFilter !== "all") {
      // Query with status filter - requires composite index or in-memory sort
      query = adminDb.collection("registration_requests")
        .where("status", "==", statusFilter)
        .limit(limit * 2); // Fetch more since we'll sort client-side
    } else {
      // No filter - can order directly
      query = adminDb.collection("registration_requests")
        .orderBy("requested_at", "desc")
        .limit(limit);
    }

    const snapshot = await query.get();

    let docs = snapshot.docs;
    
    // Sort client-side when filtering by status
    if (statusFilter !== "all") {
      docs = docs.sort((a, b) => {
        const aTime = a.data().requested_at?.toMillis?.() || 0;
        const bTime = b.data().requested_at?.toMillis?.() || 0;
        return bTime - aTime; // Descending
      }).slice(0, limit);
    }

    const requests: RegistrationRequest[] = docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email || "",
        name: data.name || "",
        status: (data.status || "pending") as RegistrationStatus,
        requested_at: toDateSafe(data.requested_at),
        
        // Approval fields
        approved_by: data.approved_by,
        approved_at: toDateSafe(data.approved_at),
        player_id: data.player_id,
        
        // Rejection fields
        rejected_by: data.rejected_by,
        rejected_at: toDateSafe(data.rejected_at),
        rejection_reason: data.rejection_reason,
      } as RegistrationRequest;
    });

    return NextResponse.json({ requests });
  } catch (e: any) {
    console.error("Error fetching registrations:", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: e?.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
