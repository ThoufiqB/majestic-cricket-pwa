// src/app/api/admin/events/[eventId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

async function requireAdmin() {
  const u = await requireSessionUser();
  const uid = u.uid;

  const meSnap = await adminDb.collection("players").doc(uid).get();
  const me = meSnap.data() || {};
  if (String(me.role || "").toLowerCase() !== "admin") {
    return { ok: false as const, res: NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 }) };
  }

  return { ok: true as const, uid };
}

function startsAtToDate(starts_at: any): Date {
  if (!starts_at) return new Date(0);
  if (typeof starts_at?.toDate === "function") return starts_at.toDate();
  const d = new Date(starts_at);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

async function deleteSubcollection(pathRef: FirebaseFirestore.CollectionReference) {
  // Deletes docs in batches of 400 to stay under limits comfortably
  while (true) {
    const snap = await pathRef.limit(400).get();
    if (snap.empty) break;

    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  try {
    const { eventId } = await ctx.params;
    const ref = adminDb.collection("events").doc(String(eventId));
    const snap = await ref.get();

    if (!snap.exists) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const ev = snap.data() || {};
    const startsAt = startsAtToDate(ev.starts_at);
    const now = adminTs.now().toDate();

    if (now.getTime() >= startsAt.getTime()) {
      return NextResponse.json({ error: "Event started — cannot edit" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));

    const patch: any = {};
    if (body.title !== undefined) {
      const t = String(body.title || "").trim();
      if (!t) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      patch.title = t;
    }
    if (body.fee !== undefined) {
      const fee = Number(body.fee);
      if (!Number.isFinite(fee) || fee < 0) return NextResponse.json({ error: "Invalid fee" }, { status: 400 });
      patch.fee = fee;
    }
    if (body.group !== undefined) {
      const g = String(body.group || "").trim().toLowerCase();
      if (!["men", "women", "mixed"].includes(g)) {
        return NextResponse.json({ error: "group must be men, women, or mixed" }, { status: 400 });
      }
      patch.group = g;
    }
    if (body.starts_at !== undefined) {
      const iso = String(body.starts_at || "").trim();
      const dt = new Date(iso);
      if (!iso || isNaN(dt.getTime())) return NextResponse.json({ error: "Invalid starts_at" }, { status: 400 });
      patch.starts_at = dt;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    patch.updated_at = adminTs.now();
    patch.updated_by = gate.uid;

    await ref.update(patch);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.res;

  try {
    const { eventId } = await ctx.params;
    const ref = adminDb.collection("events").doc(String(eventId));
    const snap = await ref.get();

    if (!snap.exists) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const ev = snap.data() || {};
    const startsAt = startsAtToDate(ev.starts_at);
    const now = adminTs.now().toDate();

    if (now.getTime() >= startsAt.getTime()) {
      return NextResponse.json({ error: "Event started — cannot delete" }, { status: 409 });
    }

    // Cascade delete attendance subcollection (if you use it)
    const attRef = ref.collection("attendees");
    await deleteSubcollection(attRef);

    // (Optional) delete other subcollections if you have them:
    // await deleteSubcollection(ref.collection("payments"));

    await ref.delete();

    return NextResponse.json({ ok: true, deleted: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
