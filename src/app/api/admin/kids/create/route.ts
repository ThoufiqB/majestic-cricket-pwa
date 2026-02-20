import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, badRequest, ok } from "@/app/api/_util";
import { KidsProfile } from "@/lib/types/kids";
import { FieldValue } from "firebase-admin/firestore";
import { calculateAgeFromMonthYear } from "@/lib/ageCalculator";

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

// POST /api/admin/kids/create
export async function POST(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const body = await req.json().catch(() => ({}));
    const parentEmail = normEmail(body.parent_email);
    const name = String(body.name || "").trim();
    const yearOfBirth = Number(body.year_of_birth);
    const monthOfBirth = Number(body.month_of_birth);

    // Validation
    if (!parentEmail) throw badRequest("parent_email is required");
    if (!name) throw badRequest("name is required");
    if (!yearOfBirth || !Number.isInteger(yearOfBirth) || yearOfBirth < 1990 || yearOfBirth > new Date().getFullYear()) {
      throw badRequest("year_of_birth must be a valid year (1990â€“present)");
    }
    if (!monthOfBirth || !Number.isInteger(monthOfBirth) || monthOfBirth < 1 || monthOfBirth > 12) {
      throw badRequest("month_of_birth must be between 1 and 12");
    }
    // Ensure not in the future
    const now = new Date();
    if (yearOfBirth > now.getFullYear() || (yearOfBirth === now.getFullYear() && monthOfBirth > now.getMonth() + 1)) {
      throw badRequest("Birth year/month cannot be in the future");
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
    const age = calculateAgeFromMonthYear(monthOfBirth, yearOfBirth);

    // Create kid profile
    const kidId = adminDb.collection("kids_profiles").doc().id;

    const kidData: Partial<KidsProfile> = {
      kid_id: kidId,
      player_id: parentUid,
      name,
      yearOfBirth,
      monthOfBirth,
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

