import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError } from "@/app/api/_util";
import type { RegistrationStatus } from "@/lib/types/auth";

/**
 * POST /api/me/requests/[id]/reject
 * Body: { reason?: string }
 *
 * Called by the payment manager (parent) to decline a youth player's
 * profile-manager request.
 *
 * Flow on rejection:
 *  1. parent_requests doc → status: "rejected"
 *  2. registration_requests doc → status: "rejected_by_parent"
 *     The youth player can see this on their profile Requests tab
 *     and re-submit with a different payment manager.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const u = await requireSessionUser();
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason || "").trim() || "Declined by parent/guardian";

    // Fetch the parent_request doc
    const prRef = adminDb.collection("parent_requests").doc(id);
    const prSnap = await prRef.get();

    if (!prSnap.exists) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const pr = prSnap.data() as any;

    // Only the designated parent can reject
    if (pr.parent_uid !== u.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (pr.status !== "pending") {
      return NextResponse.json(
        { error: `Request already ${pr.status}` },
        { status: 400 }
      );
    }

    const now = adminTs.now();

    const regRef = adminDb.collection("registration_requests").doc(pr.youth_uid);
    const regSnap = await regRef.get();

    const batch = adminDb.batch();

    batch.update(prRef, {
      status: "rejected",
      resolved_at: now,
      resolved_by: u.uid,
      rejection_reason: reason,
    });

    if (regSnap.exists) {
      batch.update(regRef, {
        status: "rejected_by_parent" as RegistrationStatus,
        parent_rejected_at: now,
        parent_rejected_by: u.uid,
        rejection_reason: reason,
        can_resubmit: true,
      });
    }

    await batch.commit();

    return NextResponse.json({
      ok: true,
      message: "You have declined the profile-manager request.",
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
