import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { handleApiError, forbidden, ok } from "@/app/api/_util";

async function requireAdmin() {
  const u = await requireSessionUser();
  const snap = await adminDb.collection("players").doc(u.uid).get();
  const data = snap.data() || {};
  if (String(data.role || "").toLowerCase() !== "admin") {
    throw forbidden();
  }
  return u;
}

function toIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireSessionUser();
    const { id } = await ctx.params;
    const snap = await adminDb.collection("qna").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const raw: any = snap.data() || {};
    return ok({
      id: snap.id,
      ...raw,
      asked_at: toIso(raw.asked_at),
      answered_at: toIso(raw.answered_at),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const ref = adminDb.collection("qna").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await ref.delete();
    return ok({ deleted: true });
  } catch (e) {
    return handleApiError(e);
  }
}
