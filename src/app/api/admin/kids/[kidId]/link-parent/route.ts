import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, badRequest, ok } from "@/app/api/_util";
import { FieldValue } from "firebase-admin/firestore";

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}

async function requireAdmin(uid: string) {
  const snap = await adminDb.collection("players").doc(uid).get();
  const me = snap.data() || {};
  const isAdmin = String(me.role || "").toLowerCase() === "admin";
  if (!isAdmin) throw new Error("Forbidden");
  return me;
}

// PATCH /api/admin/kids/{kidId}/link-parent
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ kidId: string }> }
) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const { kidId } = await params;
    const body = await req.json().catch(() => ({}));
    const secondaryParentEmail = normEmail(body.secondary_parent_email);

    if (!kidId) throw badRequest("kidId is required");
    if (!secondaryParentEmail) throw badRequest("secondary_parent_email is required");

    // Check kid exists
    const kidRef = adminDb.collection("kids_profiles").doc(kidId);
    const kidSnap = await kidRef.get();
    if (!kidSnap.exists) throw badRequest(`Kid profile ${kidId} not found`);

    const kidData = kidSnap.data() as any;

    // Check secondary parent exists
    const secondaryParentSnap = await adminDb
      .collection("players")
      .where("email", "==", secondaryParentEmail)
      .limit(1)
      .get();

    if (secondaryParentSnap.empty) {
      throw badRequest(`Parent with email ${secondaryParentEmail} not found in system`);
    }

    const secondaryParentUid = secondaryParentSnap.docs[0].id;

    // Check not already linked
    if (kidData.parent_emails.includes(secondaryParentEmail)) {
      throw badRequest(`Parent ${secondaryParentEmail} already linked to this kid`);
    }

    // Add to parent_emails
    await kidRef.set(
      {
        parent_emails: FieldValue.arrayUnion(secondaryParentEmail),
        linked_parents: FieldValue.arrayUnion({
          parent_uid: secondaryParentUid,
          linked_by: u.email || u.uid,
          linked_at: new Date().toISOString(),
        }),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Add kid_id to secondary parent's kids_profiles array
    const secondaryParentRef = adminDb.collection("players").doc(secondaryParentUid);
    await secondaryParentRef.set(
      {
        kids_profiles: FieldValue.arrayUnion(kidId),
        linked_parents: FieldValue.arrayUnion({
          parent_uid: kidData.player_id, // link back to primary parent
          linked_at: new Date().toISOString(),
          status: "active",
        }),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return ok({
      success: true,
      linked_at: new Date().toISOString(),
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
