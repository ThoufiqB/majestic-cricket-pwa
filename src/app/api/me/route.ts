// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}

export async function GET() {
  try {
    const u = await requireSessionUser();
    const uid = u.uid;

    const ref = adminDb.collection("players").doc(uid);
    const snap = await ref.get();
    const data = snap.data() || {};

    // Fetch kid profile details if kids_profiles array exists
    let kids_profiles: any[] = [];
    if (Array.isArray(data.kids_profiles) && data.kids_profiles.length > 0) {
      try {
        const kidSnaps = await Promise.all(
          data.kids_profiles.map((kidId: string) =>
            adminDb.collection("kids_profiles").doc(kidId).get()
          )
        );
        kids_profiles = kidSnaps
          .filter((snap) => snap.exists && snap.data()?.status === "active")
          .map((snap) => {
            const kidData = snap.data();
            return {
              ...kidData,
              created_at: kidData?.created_at instanceof Date ? kidData.created_at : new Date(kidData?.created_at),
              updated_at: kidData?.updated_at instanceof Date ? kidData.updated_at : new Date(kidData?.updated_at),
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

    return NextResponse.json({
      player_id: uid,
      ...data,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 401 });
  }
}
