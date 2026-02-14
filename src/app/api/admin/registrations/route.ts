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
 * 
 * NEW ARCHITECTURE:
 * - "approved" status queries players collection (requests are deleted on approval)
 * - "pending" and "rejected" query registration_requests collection
 * - Rejected requests older than 15 days are automatically cleaned up
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "50");

    let requests: RegistrationRequest[] = [];

    if (statusFilter === "approved") {
      // NEW: Query players collection for approved users
      // Registration requests are deleted on approval, so we read from players
      const playersRef = adminDb.collection("players");
      const snapshot = await playersRef
        .where("approval.is_approved", "==", true)
        .orderBy("approval.approved_at", "desc")
        .limit(limit)
        .get();

      requests = snapshot.docs.map((doc) => {
        const data = doc.data();
        const approval = data.approval || {};
        return {
          uid: doc.id,
          email: data.email || "",
          name: data.name || "",
          status: "approved" as RegistrationStatus,
          requested_at: toDateSafe(approval.requested_at || data.created_at),
          
          // Approval fields from player.approval object
          approved_by: approval.approved_by,
          approved_at: toDateSafe(approval.approved_at),
          player_id: doc.id,
          admin_notes: approval.admin_notes,
          
          // Additional player fields for display
          groups: data.groups || [],
          group: data.group,
          member_type: data.member_type,
          phone: data.phone,
          yearOfBirth: data.yearOfBirth,
          gender: data.gender,
          hasPaymentManager: data.hasPaymentManager,
          paymentManagerId: data.paymentManagerId,
          paymentManagerName: data.paymentManagerName,
        } as RegistrationRequest;
      });
      
    } else {
      // Query registration_requests for pending, rejected, or all
      let query;

      if (statusFilter !== "all") {
        query = adminDb.collection("registration_requests")
          .where("status", "==", statusFilter)
          .limit(limit * 2);
      } else {
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
          return bTime - aTime;
        }).slice(0, limit);
      }

      // NEW: Cleanup rejected requests older than 15 days
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const docsToDelete: any[] = [];

      requests = docs.map((doc) => {
        const data = doc.data();
        const rejectedAt = toDateSafe(data.rejected_at);
        
        // Mark old rejected requests for deletion
        if (data.status === "rejected" && rejectedAt && rejectedAt < fifteenDaysAgo) {
          docsToDelete.push(doc.ref);
        }
        
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
          rejected_at: rejectedAt,
          rejection_reason: data.rejection_reason,
          rejection_notes: data.rejection_notes,
          
          // Profile fields
          groups: data.groups || [],
          group: data.group,
          member_type: data.member_type,
          phone: data.phone,
          yearOfBirth: data.yearOfBirth,
          gender: data.gender,
          hasPaymentManager: data.hasPaymentManager,
          paymentManagerId: data.paymentManagerId,
          paymentManagerName: data.paymentManagerName,
        } as RegistrationRequest;
      });

      // Background cleanup: Delete old rejected requests (don't await - fire and forget)
      if (docsToDelete.length > 0) {
        const batch = adminDb.batch();
        docsToDelete.forEach(ref => batch.delete(ref));
        batch.commit().catch(err => {
          console.error("Failed to cleanup old rejected requests:", err);
        });
        console.log(`🧹 Cleaning up ${docsToDelete.length} rejected requests older than 15 days`);
      }
    }

    return NextResponse.json({ requests });
  } catch (e: any) {
    console.error("Error fetching registrations:", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: e?.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
