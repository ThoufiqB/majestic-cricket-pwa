import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, badRequest, ok } from "@/app/api/_util";
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

// PATCH /api/admin/kids/{kidId}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ kidId: string }> }) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const { kidId } = await params;
    const body = await req.json().catch(() => ({}));
    const name = body.name ? String(body.name).trim() : undefined;
    const yearOfBirth = body.year_of_birth !== undefined ? Number(body.year_of_birth) : undefined;
    const monthOfBirth = body.month_of_birth !== undefined ? Number(body.month_of_birth) : undefined;

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

    if (yearOfBirth !== undefined || monthOfBirth !== undefined) {
      // Both must be provided together
      const existingData = kidSnap.data() as any;
      const resolvedYear = yearOfBirth ?? existingData.yearOfBirth;
      const resolvedMonth = monthOfBirth ?? existingData.monthOfBirth;

      if (!Number.isInteger(resolvedYear) || resolvedYear < 1990 || resolvedYear > new Date().getFullYear()) {
        throw badRequest("year_of_birth must be a valid year (1990–present)");
      }
      if (!Number.isInteger(resolvedMonth) || resolvedMonth < 1 || resolvedMonth > 12) {
        throw badRequest("month_of_birth must be between 1 and 12");
      }
      const now = new Date();
      if (resolvedYear > now.getFullYear() || (resolvedYear === now.getFullYear() && resolvedMonth > now.getMonth() + 1)) {
        throw badRequest("Birth year/month cannot be in the future");
      }
      updateData.yearOfBirth = resolvedYear;
      updateData.monthOfBirth = resolvedMonth;
      updateData.age = calculateAgeFromMonthYear(resolvedMonth, resolvedYear);
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
