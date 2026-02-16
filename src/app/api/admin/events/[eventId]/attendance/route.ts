// src/app/api/admin/events/[eventId]/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { deriveCategory } from "@/lib/deriveCategory";

type PaidStatus = "UNPAID" | "PENDING" | "PAID" | "REJECTED";

function normPaid(v: any): PaidStatus {
  const s = String(v || "").toUpperCase();
  if (s === "PAID" || s === "PENDING" || s === "REJECTED") return s;
  return "UNPAID";
}

function normAttending(v: any): "" | "YES" | "NO" {
  const s = String(v || "").toUpperCase();
  if (s === "YES" || s === "NO") return s;
  return "";
}

function toIso(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v?.toDate === "function") return v.toDate().toISOString(); // Firestore Timestamp
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function requireAdmin() {
  const u = await requireSessionUser();
  const snap = await adminDb.collection("players").doc(u.uid).get();
  const me = snap.data() || {};
  if (String(me.role || "").toLowerCase() !== "admin") {
    throw new Error("Forbidden");
  }
  return u.uid;
}

function httpStatusFromError(msg: string) {
  return msg === "Forbidden" ? 403 : 401;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) {
  try {
    await requireAdmin();

    const { eventId } = await ctx.params;
    const id = String(eventId || "").trim();
    if (!id) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const evRef = adminDb.collection("events").doc(id);
    const evSnap = await evRef.get();
    if (!evSnap.exists) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const rawEv: any = evSnap.data() || {};
    const ev = {
      event_id: evSnap.id,
      ...rawEv,
      // Normalize timestamps so UI never gets "Invalid Date"
      starts_at: toIso(rawEv.starts_at),
      created_at: toIso(rawEv.created_at),
      updated_at: toIso(rawEv.updated_at),
    };

    const eventTargetGroups = Array.isArray(rawEv.targetGroups) ? rawEv.targetGroups : [];
    const isKidsEvent = rawEv.kids_event === true;

    let rows: any[] = [];

    if (isKidsEvent) {
      // ✅ For kids events, load from kids_attendance collection
      const kidsAttSnap = await evRef.collection("kids_attendance").get();
      
      // Fetch kid profile details for each kid who has attendance record
      const kidIds = kidsAttSnap.docs.map(d => d.id);
      const kidProfiles = kidIds.length > 0 
        ? await Promise.all(kidIds.map(id => adminDb.collection("kids_profiles").doc(id).get()))
        : [];
      
      const kidProfileById = new Map<string, any>();
      kidProfiles.forEach(snap => {
        if (snap.exists) {
          kidProfileById.set(snap.id, snap.data());
        }
      });

      rows = kidsAttSnap.docs.map((d) => {
        const a: any = d.data() || {};
        const kidProfile = kidProfileById.get(d.id) || {};

        const feeRaw = a.fee_due;
        const fee_due =
          feeRaw === null || typeof feeRaw === "undefined" || feeRaw === ""
            ? null
            : Number(feeRaw);

        return {
          player_id: d.id,
          name: String(a.name || kidProfile.name || "Unknown Kid"),
          email: String(kidProfile.parent_emails?.[0] || ""),
          group: "kids",

          attending: a.attending === true || String(a.attending).toUpperCase() === "YES" ? "YES" : a.attending === false ? "NO" : "",
          attended: !!a.attended,
          paid_status: normPaid(a.payment_status),
          fee_due,
        };
      });
    } else {
      // Load eligible players based on event's targetGroups
      const playersCol = adminDb.collection("players");
      const allPlayersSnap = await playersCol.get();
      
      const playerDocs = allPlayersSnap.docs.filter((d) => {
        const data = d.data() as any;
        const status = String(data?.status || "active").toLowerCase();
        if (status === "inactive") return false;
        
        // Check if player's groups intersect with event's targetGroups
        const playerGroups = Array.isArray(data.groups) ? data.groups : [];
        
        // If event has no targetGroups, include all players (backward compat)
        if (eventTargetGroups.length === 0) return true;
        
        // Check intersection between player groups and event target groups
        return playerGroups.some((pg: string) => eventTargetGroups.includes(pg));
      });

      // ✅ SINGLE SOURCE OF TRUTH:
      // Everything for admin + player lives here:
      // events/{eventId}/attendees/{playerId}
      const attendeeRefs = playerDocs.map((p) => evRef.collection("attendees").doc(p.id));
      const attendeeSnaps = attendeeRefs.length ? await adminDb.getAll(...attendeeRefs) : [];

      const attendeeById = new Map<string, any>();
      attendeeSnaps.forEach((s) => attendeeById.set(s.id, s.data() || {}));

      rows = playerDocs
        .map((p) => {
          const pd: any = p.data() || {};
          const a: any = attendeeById.get(p.id) || {};

          const attending = normAttending(a.attending);
          const hasAttendeeRecord = Object.keys(a).length > 0;

          // Only include players who are attending (YES), or have an attendee record (approved/added by admin)
          if (attending !== "YES" && !hasAttendeeRecord) return null;

          const feeRaw = a.fee_due;
          const fee_due =
            feeRaw === null || typeof feeRaw === "undefined" || feeRaw === ""
              ? null
              : Number(feeRaw);

          const category = deriveCategory(pd.gender, pd.hasPaymentManager, pd.group);
          
          return {
            player_id: p.id,
            name: String(pd.name || a.name || ""),
            email: String(pd.email || a.email || ""),
            group: category, // Use derived category for display

            attending,
            attended: !!a.attended,
            paid_status: normPaid(a.paid_status),
            fee_due,
          };
        })
        .filter(Boolean); // Remove nulls (non-attending, not approved/added)
    }

    return NextResponse.json({ event: ev, rows });
  } catch (e: any) {
    const msg = String(e?.message || e);
    return NextResponse.json({ error: msg }, { status: httpStatusFromError(msg) });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ eventId: string }> }) {
  try {
    await requireAdmin();

    const { eventId } = await ctx.params;
    const id = String(eventId || "").trim();
    if (!id) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const player_id = String(body.player_id || "").trim();
    if (!player_id) return NextResponse.json({ error: "Missing player_id" }, { status: 400 });

    const patch: any = { updated_at: adminTs.now() };

    // Admin updates (all stored in attendees)
    if (typeof body.attending === "string") patch.attending = normAttending(body.attending);
    if (typeof body.attended === "boolean") patch.attended = body.attended;
    if (typeof body.paid_status !== "undefined") patch.paid_status = normPaid(body.paid_status);

    if ("fee_due" in body) {
      patch.fee_due = body.fee_due === null || body.fee_due === "" ? null : Number(body.fee_due);
    }

    // Prevent no-op writes
    const keys = Object.keys(patch).filter((k) => k !== "updated_at");
    if (keys.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const evRef = adminDb.collection("events").doc(id);
    const evSnap = await evRef.get();
    const isKidsEvent = evSnap.exists && (evSnap.data() as any)?.kids_event === true;

    // ✅ Write to correct collection based on event type
    const collectionName = isKidsEvent ? "kids_attendance" : "attendees";
    
    // ✅ For kids events, map paid_status to payment_status
    if (isKidsEvent && "paid_status" in patch) {
      patch.payment_status = patch.paid_status;
      delete patch.paid_status;
    }
    
    await evRef.collection(collectionName).doc(player_id).set(patch, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e);
    return NextResponse.json({ error: msg }, { status: httpStatusFromError(msg) });
  }
}
