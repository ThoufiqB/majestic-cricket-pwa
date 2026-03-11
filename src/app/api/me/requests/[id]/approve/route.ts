import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError } from "@/app/api/_util";
import type { RegistrationStatus } from "@/lib/types/auth";

/**
 * POST /api/me/requests/[id]/approve
 *
 * Called by the payment manager (parent) to approve a youth player's
 * profile-manager request.
 *
 * Flow on approval:
 *  1. parent_requests doc → status: "approved"
 *  2. registration_requests doc → status: "pending_admin_approval"
 *     (now visible to admin as a normal pending request)
 *
 * NOTE: linked_youth is NOT written here. It is written atomically in
 * the admin-approve route once the youth players doc actually exists.
 * Writing it here would cause the parent's /api/me to filter it out
 * (youth has no players doc yet) and the profile switcher would never
 * appear until a hard refresh after admin approval.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const u = await requireSessionUser();
    const { id } = await params;

    // Fetch the parent_request doc
    const prRef = adminDb.collection("parent_requests").doc(id);
    const prSnap = await prRef.get();

    if (!prSnap.exists) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const pr = prSnap.data() as any;

    // Only the designated parent can approve
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

    // Batch: update parent_request + update registration_request
    const regRef = adminDb.collection("registration_requests").doc(pr.youth_uid);
    const regSnap = await regRef.get();

    if (!regSnap.exists) {
      return NextResponse.json(
        { error: "Registration request for this player no longer exists" },
        { status: 404 }
      );
    }

    const batch = adminDb.batch();

    batch.update(prRef, {
      status: "approved",
      resolved_at: now,
      resolved_by: u.uid,
    });

    batch.update(regRef, {
      status: "pending_admin_approval" as RegistrationStatus,
      parent_approved_at: now,
      parent_approved_by: u.uid,
    });

    // NOTE: We deliberately do NOT write linked_youth here.
    // The link is added atomically in /api/admin/registrations/[uid]/approve
    // once the youth players doc exists, so /api/me can always find it.

    await batch.commit();

    return NextResponse.json({
      ok: true,
      message: "You have approved the profile-manager request. An admin will review it next.",
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
