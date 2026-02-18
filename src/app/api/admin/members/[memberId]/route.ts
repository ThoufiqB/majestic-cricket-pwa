import { NextRequest } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireAdminUser } from "@/lib/requireAdmin";
import { handleApiError, ok } from "@/app/api/_util";
import { calculateAgeFromMonthYear } from "@/lib/ageCalculator";

// GET /api/admin/members/[memberId] - Get member details with kids
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    await requireAdminUser();
    const { memberId } = await params;

    const snap = await adminDb.collection("players").doc(memberId).get();
    if (!snap.exists) {
      return ok({ error: "Member not found" }, 404);
    }

    const data = snap.data() || {};

    // Fetch linked kids if any
    let kids: any[] = [];
    if (Array.isArray(data.kids_profiles) && data.kids_profiles.length > 0) {
      const kidSnaps = await Promise.all(
        data.kids_profiles.map((kidId: string) =>
          adminDb.collection("kids_profiles").doc(kidId).get()
        )
      );
      kids = kidSnaps
        .filter((s) => s.exists)
        .map((s) => {
          const kd = s.data();
          return {
            kid_id: s.id,
            name: kd?.name || "Unknown",
            dob: kd?.dob || null,
            age: kd?.age || null,
            status: kd?.status || "active",
          };
        });
    }

    return ok({
      player_id: memberId,
      name: data.name || "Unknown",
      email: data.email || "",
      phone: data.phone || "",
      group: data.group || "men",
      groups: data.groups || [],
      gender: data.gender || null,
      yearOfBirth: data.yearOfBirth || null,
      monthOfBirth: data.monthOfBirth || null,
      member_type: data.member_type || "regular",
      role: data.role || "player",
      status: data.status || "active",
      created_at: data.created_at?.toDate?.()?.toISOString() || null,
      kids,
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}

// PATCH /api/admin/members/[memberId] - Update member (role, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    await requireAdminUser();
    const { memberId } = await params;
    const body = await req.json();

    const snap = await adminDb.collection("players").doc(memberId).get();
    if (!snap.exists) {
      return ok({ error: "Member not found" }, 404);
    }

    const data = snap.data() || {};

    // Only allow updating certain fields
    const allowedFields = ["role", "phone", "group", "groups", "gender"];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate groups against age eligibility
    if (updates.groups !== undefined) {
      const groups: string[] = updates.groups;
      const yearOfBirth: number | null = data.yearOfBirth ?? null;
      const monthOfBirth: number | null = data.monthOfBirth ?? null;
      const ADULT_GROUPS = ["men", "women"];
      const YOUTH_GROUPS = ["U-18", "U-15", "U-13"];

      if (yearOfBirth !== null) {
        const age = calculateAgeFromMonthYear(
          monthOfBirth ?? undefined,
          yearOfBirth
        );
        const isAdult = age >= 18;

        if (isAdult) {
          const hasYouth = groups.some((g) => YOUTH_GROUPS.includes(g));
          if (hasYouth) {
            return ok(
              { error: "Adult members (18+) cannot be assigned to youth groups." },
              400
            );
          }
        } else {
          const hasAdult = groups.some((g) => ADULT_GROUPS.includes(g));
          if (hasAdult) {
            return ok(
              { error: "Youth players (under 18) cannot be assigned to men's or women's groups." },
              400
            );
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return ok({ error: "No valid fields to update" }, 400);
    }

    updates.updated_at = adminTs.now();

    await adminDb.collection("players").doc(memberId).update(updates);

    return ok({ success: true, updated: updates });
  } catch (e: any) {
    return handleApiError(e);
  }
}
