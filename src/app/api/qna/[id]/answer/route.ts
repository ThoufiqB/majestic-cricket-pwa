import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, forbidden, badRequest, ok } from "@/app/api/_util";

async function requireAdmin() {
  const u = await requireSessionUser();
  const snap = await adminDb.collection("players").doc(u.uid).get();
  const data = snap.data() || {};
  if (String(data.role || "").toLowerCase() !== "admin") {
    throw forbidden();
  }
  return u;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireAdmin();
    const { id } = await ctx.params;

    const ref = adminDb.collection("qna").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const answer = String(body.answer || "").trim();
    if (!answer) throw badRequest("answer is required");
    if (answer.length > 2000) throw badRequest("answer must be 2000 characters or fewer");

    const now = adminTs.now();
    await ref.update({
      answer,
      answered_by: u.uid,
      answered_by_name: u.name || u.email,
      answered_at: now,
      status: "answered",
      is_admin_answer: true,
    });

    return ok({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
