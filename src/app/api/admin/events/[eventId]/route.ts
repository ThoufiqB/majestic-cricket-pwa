import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

async function requireAdmin() {
  const u = await requireSessionUser();
  const uid = u.uid;

  const meSnap = await adminDb.collection("players").doc(uid).get();
  const me = meSnap.data() || {};
  const isAdmin = String(me.role || "").toLowerCase() === "admin";
  if (!isAdmin) throw new Error("Forbidden");

  return { uid };
}

function toDateAny(v: any): Date | null {
  if (!v) return null;
  if (v?.toDate?.() instanceof Date) return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function getEventOrThrow(eventId: string) {
  const ref = adminDb.collection("events").doc(eventId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Event not found");
  const data: any = snap.data() || {};
  const startsAt = toDateAny(data.starts_at);
  if (!startsAt) throw new Error("Invalid event starts_at");
  return { ref, data, startsAt };
}

/**
 * PATCH /api/admin/events/:eventId
 * body: { title?, fee?, starts_at? }
 * Rule: cannot edit if starts_at <= now
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) {
  try {
    await requireAdmin();

    const { eventId } = await ctx.params;
    const { ref, startsAt } = await getEventOrThrow(eventId);

    const now = new Date();
    if (startsAt <= now) {
      return NextResponse.json(
        { error: "Cannot edit: event has started or already passed." },
        { status: 400 }
      );
    }

    const body = await req.json();

    const patch: any = { updated_at: adminTs.now() };

    if (body?.title !== undefined) {
      const title = String(body.title || "").trim();
      if (!title) return NextResponse.json({ error: "Invalid title" }, { status: 400 });
      patch.title = title;
    }

    if (body?.fee !== undefined) {
      const fee = Number(body.fee);
      if (!Number.isFinite(fee) || fee < 0) return NextResponse.json({ error: "Invalid fee" }, { status: 400 });
      patch.fee = fee;
    }

    if (body?.starts_at !== undefined) {
      const dt = new Date(String(body.starts_at || ""));
      if (isNaN(dt.getTime())) return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 });
      patch.starts_at = dt;
    }

    // IMPORTANT: we do NOT touch attendance / paid tracking anywhere here.
    await ref.update(patch);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes("forbidden") ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * DELETE /api/admin/events/:eventId
 * Rule: cannot delete if starts_at <= now
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) {
  try {
    await requireAdmin();

    const { eventId } = await ctx.params;
    const { ref, startsAt } = await getEventOrThrow(eventId);

    const now = new Date();
    if (startsAt <= now) {
      return NextResponse.json(
        { error: "Cannot delete: event has started or already passed." },
        { status: 400 }
      );
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes("forbidden") ? 403 : 401;
    return NextResponse.json({ error: msg }, { status });
  }
}
