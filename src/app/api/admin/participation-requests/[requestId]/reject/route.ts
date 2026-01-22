import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

/**
 * POST /api/admin/participation-requests/{requestId}/reject
 *
 * Reject a participation request.  Only admins may call this.  The
 * request status is updated to 'rejected'.  No attendance record is
 * modified.  If the request is already resolved, returns an error.
 */
type Ctx = { params: Promise<{ requestId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const u = await requireSessionUser();
    if (!u) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { requestId } = await ctx.params;
    const rid = String(requestId || "");
    if (!rid) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }
    // Verify admin role
    const meSnap = await adminDb.collection("players").doc(u.uid).get();
    const me: any = meSnap.data() || {};
    if (String(me?.role || "").toLowerCase() !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const ref = adminDb.collection("participation_requests").doc(rid);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    const data: any = snap.data();
    if (data.status !== "pending") {
      return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
    }
    await ref.update({
      status: "rejected",
      resolved_at: adminTs.now(),
      resolved_by: u.uid,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}