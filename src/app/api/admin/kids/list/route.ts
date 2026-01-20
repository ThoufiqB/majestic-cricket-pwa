import { NextRequest } from "next/server";
import admin from "firebase-admin";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, ok } from "@/app/api/_util";
import { KidsProfile } from "@/lib/types/kids";

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}

function toDateSafe(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate(); // Firestore Timestamp
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function requireAdmin(uid: string) {
  const snap = await adminDb.collection("players").doc(uid).get();
  const me = snap.data() || {};
  const isAdmin = String(me.role || "").toLowerCase() === "admin";
  if (!isAdmin) throw new Error("Forbidden");
  return me;
}

// GET /api/admin/kids/list?parent_email=...&include_counts=1
export async function GET(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const { searchParams } = new URL(req.url);

    const parentEmail = searchParams.get("parent_email")
      ? normEmail(searchParams.get("parent_email") as string)
      : null;

    const includeCounts = searchParams.get("include_counts") === "1";

    const snap = await adminDb
      .collection("kids_profiles")
      .where("status", "==", "active")
      .get();

    let kids = snap.docs.map((d) => {
      const data = d.data() as KidsProfile;
      const anyData: any = data as any;

      return {
        ...data,
        kid_id: anyData.kid_id ?? d.id,

        // Return ISO strings so UI can't accidentally show 1970
        created_at: toDateSafe(anyData.created_at)?.toISOString() ?? null,
        updated_at: toDateSafe(anyData.updated_at)?.toISOString() ?? null,
      };
    });

    kids.sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));

    if (parentEmail) {
      kids = kids.filter((k: any) =>
        Array.isArray(k.parent_emails) && k.parent_emails.some((e: string) => normEmail(e) === parentEmail)
      );
    }

    if (!includeCounts) {
      const kidsNoCounts = kids.map((k: any) => ({ ...k, event_count: 0 }));
      return ok({ kids: kidsNoCounts, count: kidsNoCounts.length });
    }

    const FieldPath = admin.firestore.FieldPath;

    const kidsWithCounts = await Promise.all(
      kids.map(async (kid: any) => {
        try {
          const eventsSnap = await adminDb
            .collectionGroup("kids_attendance")
            .where(FieldPath.documentId(), "==", kid.kid_id)
            .get();

          // Count only where attending=true (matches your doc)
          const attendingEvents = eventsSnap.docs.filter((doc) => doc.data()?.attending === true);

          return { ...kid, event_count: attendingEvents.length };
        } catch {
          return { ...kid, event_count: 0 };
        }
      })
    );

    return ok({ kids: kidsWithCounts, count: kidsWithCounts.length });
  } catch (e: any) {
    return handleApiError(e);
  }
}
