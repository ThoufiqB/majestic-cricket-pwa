import { NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}

function toDateSafe(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  // Firestore Timestamp
  if (typeof v?.toDate === "function") return v.toDate();
  // ISO string / number
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  try {
    const u = await requireSessionUser();
    const uid = u.uid;

    const ref = adminDb.collection("players").doc(uid);
    const snap = await ref.get();
    const data = snap.data() || {};

    // Hydrate kid profile details if kids_profiles array exists (player doc stores kid IDs)
    let kids_profiles: any[] = [];
    if (Array.isArray(data.kids_profiles) && data.kids_profiles.length > 0) {
      try {
        const kidSnaps = await Promise.all(
          data.kids_profiles.map((kidId: string) =>
            adminDb.collection("kids_profiles").doc(kidId).get()
          )
        );

        kids_profiles = kidSnaps
          .filter((s) => s.exists && (s.data() as any)?.status === "active")
          .map((s) => {
            const kidData: any = s.data() || {};
            return {
              ...kidData,
              // Always guarantee kid_id for UI keys + selection
              kid_id: kidData.kid_id ?? s.id,
              created_at: toDateSafe(kidData.created_at),
              updated_at: toDateSafe(kidData.updated_at),
            };
          });
      } catch (e) {
        console.error("Error fetching kid profiles:", e);
        // Continue without kid details on error
      }
    }

    return NextResponse.json({
      player_id: uid,
      ...data,
      // IMPORTANT: overwrite any existing kids_profiles (IDs) with hydrated objects
      kids_profiles,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 401 });
  }
}

export async function POST() {
  try {
    const u = await requireSessionUser();
    const uid = u.uid;

    const ref = adminDb.collection("players").doc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      const now = adminTs.now();
      await ref.set({
        email: normEmail(u.email),
        name: String(u.name || ""),
        role: "player",
        group: "",
        member_type: "",
        phone: "",
        created_at: now,
        updated_at: now,
      });
    }

    const snap2 = await ref.get();
    const data = snap2.data() || {};

    // NOTE: POST remains "create if missing". Do NOT hydrate here to avoid breaking callers
    return NextResponse.json({
      player_id: uid,
      ...data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 401 });
  }
}
