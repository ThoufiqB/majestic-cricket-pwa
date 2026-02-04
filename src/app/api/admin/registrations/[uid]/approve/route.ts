import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/requireAdmin";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import type { PlayerStatus, RegistrationStatus } from "@/lib/types/auth";

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}

/**
 * POST /api/admin/registrations/[uid]/approve
 * Approve a registration request and create player document
 * 
 * Body (optional):
 *   - group: "men" | "women"
 *   - member_type: "standard" | "student"
 *   - phone: string
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
    const { group, member_type, phone, notes } = body;

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
        { error: "Request already approved" },
        { status: 400 }
      );
    }

    // Create player document
    const playerRef = adminDb.collection("players").doc(uid);
    const now = adminTs.now();

    // Determine if profile is complete based on provided details
    const hasGroup = !!group;
    const hasMemberType = !!member_type;
    const hasPhone = !!phone;
    const profileCompleted = hasGroup && hasMemberType && hasPhone;

    await playerRef.set({
      email: normEmail(requestData?.email || ""),
      name: String(requestData?.name || ""),
      role: "player",
      status: "active" as PlayerStatus,
      group: group || "",
      member_type: member_type || "",
      phone: phone || "",
      profile_completed: profileCompleted, // User needs to complete if false
      approved_by: adminUid,
      approved_at: now,
      created_at: now,
      updated_at: now,
    });

    // Update registration request status
    await requestRef.update({
      status: "approved" as RegistrationStatus,
      approved_by: adminUid,
      approved_at: now,
      player_id: uid,
      admin_notes: notes || "",
    });

    return NextResponse.json({ 
      ok: true,
      message: "Registration approved successfully",
      player_id: uid,
    });
  } catch (e: any) {
    console.error("Error approving registration:", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: e?.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
