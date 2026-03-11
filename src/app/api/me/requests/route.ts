import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError } from "@/app/api/_util";

function toDateSafe(v: any): string | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * GET /api/me/requests
 *
 * Returns two things:
 *  1. `incoming`  – parent_requests where parent_uid === me.uid AND status === "pending"
 *                   (shown to payment managers / parents as "Approve / Reject" cards)
 *  2. `my_status` – the current user's own registration_request status
 *                   (shown to youth players so they know where they stand)
 */
export async function GET() {
  try {
    const u = await requireSessionUser();
    const uid = u.uid;

    // 1. Incoming parent-approval requests (I am the designated payment manager)
    const incomingSnap = await adminDb
      .collection("parent_requests")
      .where("parent_uid", "==", uid)
      .where("status", "==", "pending")
      .orderBy("created_at", "desc")
      .get();

    const incoming = incomingSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        youth_uid: d.youth_uid,
        youth_name: d.youth_name,
        youth_email: d.youth_email,
        youth_groups: d.youth_groups || [],
        status: d.status,
        created_at: toDateSafe(d.created_at),
      };
    });

    // 2. My own registration request status (I am a youth player awaiting approval)
    const myRequestSnap = await adminDb
      .collection("registration_requests")
      .doc(uid)
      .get();

    let my_status: object | null = null;
    if (myRequestSnap.exists) {
      const d = myRequestSnap.data() || {};
      my_status = {
        status: d.status,
        requested_at: toDateSafe(d.requested_at),
        rejection_reason: d.rejection_reason ?? null,
        rejection_notes: d.rejection_notes ?? null,
        paymentManagerName: d.paymentManagerName ?? null,
        groups: d.groups ?? [],
      };
    }

    return NextResponse.json({ incoming, my_status });
  } catch (e: any) {
    return handleApiError(e);
  }
}
