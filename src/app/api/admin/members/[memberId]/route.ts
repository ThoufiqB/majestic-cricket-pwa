import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminUser } from "@/lib/requireAdmin";
import { handleApiError, ok } from "@/app/api/_util";

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

    // Only allow updating certain fields
    const allowedFields = ["role", "phone", "group"];
    const updates: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return ok({ error: "No valid fields to update" }, 400);
    }

    await adminDb.collection("players").doc(memberId).update(updates);

    return ok({ success: true, updated: updates });
  } catch (e: any) {
    return handleApiError(e);
  }
}
