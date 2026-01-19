import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, badRequest, ok } from "@/app/api/_util";
import { FieldValue } from "firebase-admin/firestore";

async function requireAdmin(uid: string) {
  const snap = await adminDb.collection("players").doc(uid).get();
  const me = snap.data() || {};
  const isAdmin = String(me.role || "").toLowerCase() === "admin";
  if (!isAdmin) throw new Error("Forbidden");
  return me;
}

// PATCH /api/admin/kids/{kidId}/reactivate
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ kidId: string }> }
) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const { kidId } = await params;

    if (!kidId) throw badRequest("kidId is required");

    // Check kid exists and is inactive
    const kidRef = adminDb.collection("kids_profiles").doc(kidId);
    const kidSnap = await kidRef.get();
    if (!kidSnap.exists) throw badRequest(`Kid profile ${kidId} not found`);

    const kidData = kidSnap.data() as any;
    if (kidData.status === "active") {
      throw badRequest(`Kid profile ${kidId} is already active`);
    }

    // Reactivate: mark as active
    await kidRef.set(
      {
        status: "active",
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return ok({
      success: true,
      reactivated_at: FieldValue.serverTimestamp(),
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
