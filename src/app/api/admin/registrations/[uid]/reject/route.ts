import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/requireAdmin";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import type { RegistrationStatus } from "@/lib/types/auth";

/**
 * POST /api/admin/registrations/[uid]/reject
 * Reject a registration request
 * 
 * Body (optional):
 *   - reason: string (rejection reason)
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
    const { reason } = body;

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

    if (currentStatus === "rejected") {
      return NextResponse.json(
        { error: "Request already rejected" },
        { status: 400 }
      );
    }

    // Update registration request status
    const now = adminTs.now();
    await requestRef.update({
      status: "rejected" as RegistrationStatus,
      rejected_by: adminUid,
      rejected_at: now,
      rejection_reason: reason || "No reason provided",
    });

    return NextResponse.json({ 
      ok: true,
      message: "Registration rejected successfully",
    });
  } catch (e: any) {
    console.error("Error rejecting registration:", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: e?.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
