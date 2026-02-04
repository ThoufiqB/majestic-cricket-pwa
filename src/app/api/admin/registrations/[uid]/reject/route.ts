import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/requireAdmin";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import type { RegistrationStatus, RejectionReason } from "@/lib/types/auth";
import admin from "firebase-admin";

/**
 * POST /api/admin/registrations/[uid]/reject
 * Reject a registration request
 * 
 * Body:
 *   - reason: RejectionReason (required)
 *   - notes: string (optional - additional context for user)
 *   - allow_resubmit: boolean (optional, default: true)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { me } = await requireAdminUser();
    const adminUid = me.player_id;
    
    const { uid } = await params;
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { reason, notes, allow_resubmit = true } = body;

    // Validate reason
    const validReasons: RejectionReason[] = ["incorrect_info", "incomplete", "wrong_group", "duplicate", "other"];
    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json(
        { error: `Invalid reason. Must be one of: ${validReasons.join(", ")}` },
        { status: 400 }
      );
    }

    // Get registration request
    const requestRef = adminDb.collection("registration_requests").doc(uid);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
      return NextResponse.json(
        { error: "Registration request not found" },
        { status: 404 }
      );
    }

    const requestData = requestSnap.data();
    const currentStatus = requestData?.status as RegistrationStatus;

    if (currentStatus === "approved") {
      return NextResponse.json(
        { error: "Cannot reject an already approved request" },
        { status: 400 }
      );
    }

    // Track rejection history
    const rejectionEntry = {
      rejected_at: adminTs.now(),
      rejected_by: adminUid,
      reason: reason,
      notes: notes || null,
    };

    // Increment resubmission count if this was a resubmission
    const resubmissionCount = (requestData?.resubmission_count || 0);

    // Update registration request status
    const now = adminTs.now();
    await requestRef.update({
      status: "rejected" as RegistrationStatus,
      rejected_by: adminUid,
      rejected_at: now,
      rejection_reason: reason,
      rejection_notes: notes || null,
      can_resubmit: allow_resubmit,
      rejection_history: admin.firestore.FieldValue.arrayUnion(rejectionEntry),
      updated_at: now,
    });

    return NextResponse.json({ 
      ok: true,
      message: allow_resubmit 
        ? "Registration rejected. User can edit and resubmit." 
        : "Registration rejected permanently.",
      can_resubmit: allow_resubmit,
    });
  } catch (e: any) {
    console.error("Error rejecting registration:", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: e?.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
