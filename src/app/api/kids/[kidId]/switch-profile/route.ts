import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, badRequest, ok } from "@/app/api/_util";
import { FieldValue } from "firebase-admin/firestore";

// PATCH /api/kids/{kidId}/switch-profile
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ kidId: string }> }
) {
  try {
    const u = await requireSessionUser();
    const uid = u.uid;

    const { kidId } = await params;
    const body = await req.json().catch(() => ({}));
    const activeProfileId = body.active_profile_id;

    if (!kidId) throw badRequest("kidId is required");
    if (!activeProfileId) throw badRequest("active_profile_id is required");

    // Get player document
    const playerRef = adminDb.collection("players").doc(uid);
    const playerSnap = await playerRef.get();
    if (!playerSnap.exists) throw badRequest("Player profile not found");

    const playerData = playerSnap.data() as any;
    const kidIds = playerData.kids_profiles || [];

    // Check that activeProfileId is either the player's uid or one of their kids
    const isOwnProfile = activeProfileId === uid;
    const isKidProfile = kidIds.includes(activeProfileId);

    if (!isOwnProfile && !isKidProfile) {
      throw badRequest(
        `Profile ${activeProfileId} is not accessible to this user`
      );
    }

    // Check kid profile is active if switching to kid
    if (isKidProfile) {
      const kidSnap = await adminDb.collection("kids_profiles").doc(activeProfileId).get();
      if (!kidSnap.exists || kidSnap.data()?.status === "inactive") {
        throw badRequest(`Kid profile ${activeProfileId} is not active`);
      }
    }

    // Update active_profile_id
    await playerRef.set(
      {
        active_profile_id: activeProfileId,
        last_login_profile: activeProfileId,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return ok({
      success: true,
      new_profile: {
        profile_id: activeProfileId,
        is_own: isOwnProfile,
      },
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
