import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, ok } from "@/app/api/_util";
import { KidsProfile } from "@/lib/types/kids";

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}

// GET /api/kids/profile?include=linked_parents
export async function GET(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    const uid = u.uid;

    const { searchParams } = new URL(req.url);
    const includeLinkedParents = searchParams.get("include") === "linked_parents";

    // Get player document
    const playerSnap = await adminDb.collection("players").doc(uid).get();
    if (!playerSnap.exists) {
      return ok({
        profiles: [],
        active_profile_id: null,
      });
    }

    const playerData = playerSnap.data() as any;
    const kidIds = playerData.kids_profiles || [];

    if (kidIds.length === 0) {
      return ok({
        profiles: [],
        active_profile_id: playerData.active_profile_id || null,
      });
    }

    // Fetch all kids profiles
    const profileSnapshots = await Promise.all(
      kidIds.map((id: string) => adminDb.collection("kids_profiles").doc(id).get())
    );

    const profiles = profileSnapshots
      .filter((snap) => snap.exists && snap.data()?.status === "active")
      .map((snap) => {
        const data = snap.data() as KidsProfile;
        return {
          ...data,
          created_at:
            data.created_at instanceof Date ? data.created_at : new Date(data.created_at),
          updated_at:
            data.updated_at instanceof Date ? data.updated_at : new Date(data.updated_at),
          linked_parents: includeLinkedParents ? data.linked_parents : undefined,
        };
      });

    return ok({
      profiles,
      active_profile_id: playerData.active_profile_id || null,
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
