import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { deriveCategory } from "@/lib/deriveCategory";

type Ctx = { params: Promise<{ eventId: string }> };

function toMs(v: any): number {
  if (!v) return NaN;

  // Firestore Timestamp
  if (typeof v === "object" && typeof v.toDate === "function") {
    return v.toDate().getTime();
  }

  // ISO string or Date
  const d = new Date(v);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const u = await requireSessionUser();
    const { eventId } = await ctx.params;

    const id = String(eventId || "");
    if (!id) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const attending = String(body?.attending || "").toUpperCase(); // "YES" | "NO"
    if (attending !== "YES" && attending !== "NO") {
      return NextResponse.json({ error: "Invalid attending value" }, { status: 400 });
    }

    // ✅ Load event to enforce Net Practice 48-hour cutoff
    const evSnap = await adminDb.collection("events").doc(id).get();
    if (!evSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    const ev: any = evSnap.data() || {};
    const eventType = String(ev?.event_type || "");
    const startMs = toMs(ev?.starts_at);

    // Only apply cutoff for Net Practice (Adults + Kids)
    if (eventType === "net_practice" && Number.isFinite(startMs)) {
      const cutoffMs = startMs - 48 * 60 * 60 * 1000; // 48 hours prior
      const nowMs = Date.now();

      // After cutoff, block attendance marking
      if (nowMs >= cutoffMs) {
        return NextResponse.json(
          {
            error:
              "Attendance is closed for this net session (48-hour cutoff). Please use Request Participation.",
            code: "ATTENDANCE_CUTOFF",
          },
          { status: 403 }
        );
      }
    }

    // pull player profile for consistent group/name
    const meSnap = await adminDb.collection("players").doc(u.uid).get();
    const me: any = meSnap.data() || {};
    
    // Derive category from gender + hasPaymentManager
    const category = deriveCategory(me.gender, me.hasPaymentManager, me.group);
    const groups = Array.isArray(me.groups) ? me.groups : [];

    // Calculate fee_due based on member_type (student gets 25% discount)
    const memberType = String(me.member_type || "standard").toLowerCase();
    const baseFee = Number(ev.fee || 0);
    const fee_due = memberType === "student" ? baseFee * 0.75 : baseFee;

    const ref = adminDb.collection("events").doc(id).collection("attendees").doc(u.uid);

    await ref.set(
      {
        player_id: u.uid,
        name: String(me.name || u.name || ""),
        email: String(me.email || u.email || ""),
        category, // Derived category (men/women/juniors)
        groups, // User's groups array
        attending,
        fee_due, // Calculated fee with student discount applied
        updated_at: adminTs.now(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 401 });
  }
}
