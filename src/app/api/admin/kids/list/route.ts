import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, ok } from "@/app/api/_util";
import { KidsProfile } from "@/lib/types/kids";

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

// GET /api/admin/kids/list?parent_email=...
export async function GET(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    await requireAdmin(u.uid);

    const { searchParams } = new URL(req.url);
    const parentEmail = searchParams.get("parent_email")
      ? normEmail(searchParams.get("parent_email") as string)
      : null;

    // Query only by status, sort client-side to avoid composite index requirement
    let q: FirebaseFirestore.Query = adminDb
      .collection("kids_profiles")
      .where("status", "==", "active");

    const snap = await q.get();
    let kids = snap.docs.map((d) => {
      const data = d.data() as KidsProfile;
      return {
        ...data,
        created_at: data.created_at instanceof Date ? data.created_at : new Date(data.created_at),
        updated_at: data.updated_at instanceof Date ? data.updated_at : new Date(data.updated_at),
      };
    });

    // Sort by name client-side
    kids.sort((a, b) => a.name.localeCompare(b.name));

    // Client-side filter by parent email if provided
    if (parentEmail) {
      kids = kids.filter((k) => k.parent_emails.some((e) => normEmail(e) === parentEmail));
    }

    // Get event counts for each kid (optional - skip on error)
    let kidsWithCounts = kids;
    try {
      kidsWithCounts = await Promise.all(
        kids.map(async (kid) => {
          try {
            // Use simple query without composite index - filter by kid_id only
            const eventsSnap = await adminDb
              .collectionGroup("kids_attendance")
              .where("kid_id", "==", kid.kid_id)
              .get();

            // Filter status client-side
            const activeEvents = eventsSnap.docs.filter((doc) => {
              const data = doc.data();
              return data.status === "active";
            });

            return {
              ...kid,
              event_count: activeEvents.length,
            };
          } catch (e) {
            console.error(`Error fetching events for kid ${kid.kid_id}:`, e);
            // Return without event count on error
            return {
              ...kid,
              event_count: 0,
            };
          }
        })
      );
    } catch (e) {
      console.error("Error fetching event counts:", e);
      // If event counting fails, just return kids without counts
      kidsWithCounts = kids.map(k => ({ ...k, event_count: 0 }));
    }

    return ok({
      kids: kidsWithCounts,
      count: kidsWithCounts.length,
    });
  } catch (e: any) {
    return handleApiError(e);
  }
}
