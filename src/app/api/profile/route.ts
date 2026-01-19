import { NextRequest } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { badRequest, handleApiError, ok } from "../_util";

function norm(s: any) {
  return String(s || "").trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    const uid = u.uid;

    const body = await req.json().catch(() => ({}));
    const group = norm(body.group);
    const member_type = norm(body.member_type);
    const phone = String(body.phone || "").trim();

    if (group !== "men" && group !== "women") {
      throw badRequest("Invalid group. Must be 'men' or 'women'.");
    }
    if (member_type !== "standard" && member_type !== "student") {
      throw badRequest("Invalid member_type. Must be 'standard' or 'student'.");
    }

    const ref = adminDb.collection("players").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) throw badRequest("Player profile not found. Try signing out and in again.");

    await ref.set(
      { group, member_type, phone, updated_at: adminTs.now() },
      { merge: true }
    );

    const snap2 = await ref.get();
    return ok({ me: { player_id: uid, ...(snap2.data() as any) } });
  } catch (e: any) {
    return handleApiError(e);
  }
}
