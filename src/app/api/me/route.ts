import { NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { deriveCategory } from "@/lib/deriveCategory";

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

    // Hydrate linked youth players (full player accounts managed by this parent/guardian)
    let linked_youth_profiles: any[] = [];
    if (Array.isArray(data.linked_youth) && data.linked_youth.length > 0) {
      try {
        const youthSnaps = await Promise.all(
          (data.linked_youth as string[]).map((youthUid) =>
            adminDb.collection("players").doc(youthUid).get()
          )
        );

        linked_youth_profiles = youthSnaps
          .filter((s) => s.exists && (s.data() as any)?.status === "active")
          .map((s) => {
            const d: any = s.data() || {};
            return {
              player_id: s.id,
              name: d.name || "",
              email: d.email || "",
              groups: d.groups || [],
              yearOfBirth: d.yearOfBirth ?? null,
              status: d.status,
            };
          });
      } catch (e) {
        console.error("Error fetching linked youth profiles:", e);
      }
    }

    return NextResponse.json({
      player_id: uid,
      ...data,
      // Derive category from gender + hasPaymentManager (backward compatible)
      group: deriveCategory(data.gender, data.hasPaymentManager, data.group, data.groups),
      // IMPORTANT: overwrite any existing kids_profiles (IDs) with hydrated objects
      kids_profiles,
      // Linked youth player accounts (appear in parent's profile switcher)
      linked_youth_profiles,
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
        member_type: "",
        phone: "",
        created_at: now,
        updated_at: now,
      });
    }

    const snap2 = await ref.get();
    const data = snap2.data() || {};

    // NOTE: POST remains "create if missing". Derive group for response
    return NextResponse.json({
      player_id: uid,
      ...data,
      group: deriveCategory(data?.gender, data?.hasPaymentManager, data?.group, data?.groups),
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 401 });
  }
}
