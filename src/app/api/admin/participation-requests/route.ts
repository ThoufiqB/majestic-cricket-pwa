import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

/**
 * GET /api/admin/participation-requests
 *
 * List participation requests.  Only admins may access this endpoint.
 * Supports an optional query parameter `status` to filter by request
 * status (e.g. pending, approved, rejected).
 */
export async function GET(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    if (!u) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    // Determine if the user is an admin by checking their player document.
    const meSnap = await adminDb.collection("players").doc(u.uid).get();
    const me: any = meSnap.data() || {};
    if (String(me?.role || "").toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") || "pending";
    const snapshot = await adminDb
      .collection("participation_requests")
      .where("status", "==", statusParam)
      .get();
    const items: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({ id: doc.id, ...data });
    });
    return NextResponse.json({ requests: items });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}