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

// PATCH /api/admin/kids/{kidId}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ kidId: string }> }) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const { kidId } = await params;
    const body = await req.json().catch(() => ({}));
    const name = body.name ? String(body.name).trim() : undefined;
    const dateOfBirth = body.date_of_birth ? String(body.date_of_birth).trim() : undefined;

    if (!kidId) throw badRequest("kidId is required");

    // Check kid exists
    const kidRef = adminDb.collection("kids_profiles").doc(kidId);
    const kidSnap = await kidRef.get();
    if (!kidSnap.exists) throw badRequest(`Kid profile ${kidId} not found`);

    const updateData: any = {
      updated_at: FieldValue.serverTimestamp(),
    };

    if (name) {
      updateData.name = name;
    }

    if (dateOfBirth) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
        throw badRequest("date_of_birth must be in YYYY-MM-DD format");
      }
      updateData.date_of_birth = dateOfBirth;
      updateData.age = calculateAge(dateOfBirth);
    }

    await kidRef.set(updateData, { merge: true });

    const updatedSnap = await kidRef.get();
    return ok({
      success: true,
      kid: updatedSnap.data(),
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
