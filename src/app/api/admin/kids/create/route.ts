import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, badRequest, ok } from "@/app/api/_util";
import { KidsProfile } from "@/lib/types/kids";
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

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// POST /api/admin/kids/create
export async function POST(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const body = await req.json().catch(() => ({}));
    const parentEmail = normEmail(body.parent_email);
    const name = String(body.name || "").trim();
    const dateOfBirth = String(body.date_of_birth || "").trim(); // YYYY-MM-DD

    // Validation
    if (!parentEmail) throw badRequest("parent_email is required");
    if (!name) throw badRequest("name is required");
    if (!dateOfBirth) throw badRequest("date_of_birth is required (YYYY-MM-DD)");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      throw badRequest("date_of_birth must be in YYYY-MM-DD format");
    }

    // Verify parent exists in system
    const parentSnap = await adminDb
      .collection("players")
      .where("email", "==", parentEmail)
      .limit(1)
      .get();

    if (parentSnap.empty) {
      throw badRequest(`Parent with email ${parentEmail} not found in system`);
    }

    const parentUid = parentSnap.docs[0].id;
    const age = calculateAge(dateOfBirth);

    // Create kid profile
    const kidId = adminDb.collection("kids_profiles").doc().id;

    const kidData: Partial<KidsProfile> = {
      kid_id: kidId,
      player_id: parentUid,
      name,
      date_of_birth: dateOfBirth,
      age,
      parent_emails: [parentEmail],
      status: "active",
      created_at: FieldValue.serverTimestamp() as any,
      updated_at: FieldValue.serverTimestamp() as any,
      created_by: u.email || u.uid,
      linked_parents: [],
    };

    await adminDb.collection("kids_profiles").doc(kidId).set(kidData);

    // Add kid_id to parent's kids_profiles array
    const parentRef = adminDb.collection("players").doc(parentUid);
    await parentRef.set(
      {
        kids_profiles: FieldValue.arrayUnion(kidId),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return ok({
      kid_id: kidId,
      success: true,
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
