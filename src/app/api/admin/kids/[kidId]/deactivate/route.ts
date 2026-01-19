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

// PATCH /api/admin/kids/{kidId}/deactivate
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ kidId: string }> }
) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const { kidId } = await params;

    if (!kidId) throw badRequest("kidId is required");

    // Check kid exists and is active
    const kidRef = adminDb.collection("kids_profiles").doc(kidId);
    const kidSnap = await kidRef.get();
    if (!kidSnap.exists) throw badRequest(`Kid profile ${kidId} not found`);

    const kidData = kidSnap.data() as any;
    if (kidData.status === "inactive") {
      throw badRequest(`Kid profile ${kidId} is already inactive`);
    }

    // Soft delete: mark as inactive
    await kidRef.set(
      {
        status: "inactive",
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Deactivate all attendance records for this kid (kids_attendance)
    try {
      const attendanceSnap = await adminDb
        .collectionGroup("kids_attendance")
        .where("kid_id", "==", kidId)
        .get();

      // Filter active records client-side
      const activeAttendance = attendanceSnap.docs.filter(
        (doc) => doc.data().status === "active"
      );

      const batch = adminDb.batch();
      activeAttendance.forEach((doc) => {
        batch.set(
          doc.ref,
          {
            status: "inactive",
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      if (activeAttendance.length > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.error(`Error deactivating attendance records for kid ${kidId}:`, e);
      // Continue even if attendance deactivation fails
    }

    return ok({
      success: true,
      deactivated_at: FieldValue.serverTimestamp(),
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
