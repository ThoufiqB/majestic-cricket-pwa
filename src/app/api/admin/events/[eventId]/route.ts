/**
 * GET /api/admin/events/:eventId
 * Returns event details for a single event
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) {
  try {
    await requireAdmin();
    const { eventId } = await ctx.params;
    const { data } = await getEventOrThrow(eventId);
    // Always serialize starts_at as ISO string if present
    const starts_at = data.starts_at;
    let starts_at_iso = null;
    if (starts_at) {
      if (typeof starts_at === 'string') {
        starts_at_iso = new Date(starts_at).toISOString();
      } else if (typeof starts_at?.toDate === 'function') {
        starts_at_iso = starts_at.toDate().toISOString();
      } else if (typeof starts_at?.seconds === 'number') {
        starts_at_iso = new Date(starts_at.seconds * 1000).toISOString();
      }
    }
    return NextResponse.json({ ...data, starts_at: starts_at_iso });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const status = msg.toLowerCase().includes("forbidden") ? 403 : 404;
    return NextResponse.json({ error: msg }, { status });
  }
}
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

    if (body?.targetGroups !== undefined) {
      const targetGroups = Array.isArray(body.targetGroups) ? body.targetGroups : [];
      if (targetGroups.length === 0) {
        return NextResponse.json({ error: "At least one target group required" }, { status: 400 });
      }
      const validGroups = ["Men", "Women", "U-13", "U-15", "U-18", "Kids"];
      const invalidGroups = targetGroups.filter((g: string) => !validGroups.includes(g));
      if (invalidGroups.length > 0) {
        return NextResponse.json({ error: `Invalid groups: ${invalidGroups.join(", ")}` }, { status: 400 });
      }
      patch.targetGroups = targetGroups;
      // Update kids_event flag based on whether "Kids" is in targetGroups
      patch.kids_event = targetGroups.includes("Kids");
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
