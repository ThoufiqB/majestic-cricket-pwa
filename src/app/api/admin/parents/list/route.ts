import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, ok } from "@/app/api/_util";

async function requireAdmin(uid: string) {
  const snap = await adminDb.collection("players").doc(uid).get();
  const me = snap.data() || {};
  const isAdmin = String(me.role || "").toLowerCase() === "admin";
  if (!isAdmin) throw new Error("Forbidden");
  return me;
}

// GET /api/admin/parents/list
// Returns list of all parent emails from registered players
export async function GET(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const snap = await adminDb.collection("players").get();
    
    const parents = snap.docs
      .map((doc) => {
        const data = doc.data() as any;
        return {
          player_id: doc.id,
          email: data.email || "",
          name: data.name || "Unknown",
        };
      })
      .filter((p) => p.email) // Only include records with email
      .sort((a, b) => a.email.localeCompare(b.email));

    return ok({
      parents,
      count: parents.length,
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
