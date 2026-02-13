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
 * NEW ARCHITECTURE (Feb 2026):
 * - Uses batch write for atomicity: creates player + deletes registration_request
 * - Stores approval metadata in player.approval object (not in separate request doc)
 * - Tracks admin actions in player.admin_history array for audit trail
 * - Deletes registration_request to avoid redundant data (single source of truth)
 * - Benefits: No orphaned data, 50% less storage, cleaner database
 * 
 * Body (optional):
 *   - group: "men" | "women" (deprecated - use groups)
 *   - groups: string[] (new multi-select)
 *   - member_type: "standard" | "student"
 *   - phone: string
 *   - yearOfBirth: number
 *   - hasPaymentManager: boolean
 *   - paymentManagerId: string
 *   - paymentManagerName: string
 *   - notes: string (admin notes for approval)
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
    const { 
      group,  // deprecated, keep for backward compat
      groups, 
      member_type, 
      phone, 
      notes,
      yearOfBirth,
      hasPaymentManager,
      paymentManagerId,
      paymentManagerName,
    } = body;

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

    // Use groups from request data or body
    const playerGroups = requestData?.groups || groups || (group ? [group] : []);
    const playerYearOfBirth = requestData?.yearOfBirth || yearOfBirth;
    const playerHasPaymentManager = requestData?.hasPaymentManager || hasPaymentManager || false;
    const playerPaymentManagerId = requestData?.paymentManagerId || paymentManagerId;
    const playerPaymentManagerName = requestData?.paymentManagerName || paymentManagerName;
    const playerMemberType = requestData?.member_type || member_type || "";
    const playerPhone = requestData?.phone || phone || "";

    // Create player document
    const playerRef = adminDb.collection("players").doc(uid);
    const now = adminTs.now();

    // Determine if profile is complete based on provided details
    const hasGroups = Array.isArray(playerGroups) && playerGroups.length > 0;
    const hasMemberType = !!playerMemberType;
    const hasPhone = !!playerPhone;
    const hasYearOfBirth = !!playerYearOfBirth;
    const profileCompleted = hasGroups && hasMemberType && hasPhone && hasYearOfBirth;

    const playerData: any = {
      player_id: uid,
      email: normEmail(requestData?.email || ""),
      name: String(requestData?.name || ""),
      photo: String(requestData?.photo || ""),
      role: "player",
      status: "active" as PlayerStatus,
      groups: playerGroups,
      yearOfBirth: playerYearOfBirth,
      member_type: playerMemberType,
      phone: playerPhone,
      hasPaymentManager: playerHasPaymentManager,
      profile_completed: profileCompleted,
      kids_profiles: [],
      
      // NEW: Approval metadata (moved from registration_request)
      approval: {
        is_approved: true,        // Boolean flag for efficient querying
        approved_by: adminUid,
        approved_at: now,
        admin_notes: notes || "",
        requested_at: requestData?.requested_at || null,
      },
      
      // NEW: Admin action history for audit trail
      admin_history: [
        {
          action: "approved",
          by: adminUid,
          at: now,
          notes: notes || "Registration approved",
        }
      ],
      
      created_at: now,
      updated_at: now,
    };

    // Add payment manager fields if applicable
    if (playerHasPaymentManager && playerPaymentManagerId) {
      playerData.paymentManagerId = playerPaymentManagerId;
      playerData.paymentManagerName = playerPaymentManagerName;
    }

    // Backward compatibility: set single group field
    if (playerGroups.includes("Men") || playerGroups.includes("men")) {
      playerData.group = "men";
    } else if (playerGroups.includes("Women") || playerGroups.includes("women")) {
      playerData.group = "women";
    }

    // NEW ARCHITECTURE: Use batch write for atomicity
    // Create player document AND delete registration request in a single transaction
    const batch = adminDb.batch();
    
    // Add player document creation to batch
    batch.set(playerRef, playerData);
    
    // Add registration request deletion to batch
    batch.delete(requestRef);
    
    // Commit both operations atomically
    await batch.commit();
    
    // If we reach here, both operations succeeded
    // The registration_request is now deleted - no redundant data!

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
