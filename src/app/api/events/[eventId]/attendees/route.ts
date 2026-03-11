import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";
import { deriveCategory } from "@/lib/deriveCategory";

type Ctx = { params: Promise<{ eventId: string }> };

function safeName(v: any) {
  return String(v || "").trim();
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await requireSessionUser();
    const { eventId } = await ctx.params;

    const id = String(eventId || "");
    if (!id) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const evSnap = await adminDb.collection("events").doc(id).get();
    if (!evSnap.exists) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const ev: any = evSnap.data() || {};
    const isKidsEvent = ev.kids_event === true;
    const eventTargetGroups = Array.isArray(ev.targetGroups) ? ev.targetGroups : [];

    // For kids events, return kids attendees
    if (isKidsEvent) {
      const attSnap = await adminDb.collection("events").doc(id).collection("kids_attendance").get();
      
      const kids: { kid_id: string; name: string }[] = [];
      
      for (const d of attSnap.docs) {
        const a: any = d.data() || {};
        const attending = String(a.attending || "").toUpperCase();
        if (attending !== "YES" && a.attending !== true) continue;
        
        let nm = safeName(a.name);
        
        // ✅ Fallback: if name not in attendance doc, fetch from kid profile
        if (!nm || nm === "Unknown" || nm === "") {
          try {
            const kidSnap = await adminDb.collection("kids_profiles").doc(d.id).get();
            if (kidSnap.exists) {
              const kidData = kidSnap.data();
              nm = safeName(kidData?.name) || `Kid ${d.id.substring(0, 8)}`;
            } else {
              nm = `Kid ${d.id.substring(0, 8)}`;
            }
          } catch (e) {
            nm = "Unknown Kid";
          }
        }
        
        kids.push({ kid_id: d.id, name: nm });
      }
      
      kids.sort((a, b) => a.name.localeCompare(b.name));
      
      return NextResponse.json({
        groups: { Kids: { yes: kids.length, people: kids } },
        absent: [],
      });
    }

    // For adult events, load all active players into a Map for fast lookup
    const activeById = new Map<string, any>();
    const playersSnap = await adminDb.collection("players").get();
    playersSnap.docs.forEach((d) => {
      const status = String((d.data() as any)?.status || "active").toLowerCase();
      if (status !== "inactive") {
        activeById.set(d.id, d.data() || {});
      }
    });

    const attSnap = await adminDb.collection("events").doc(id).collection("attendees").get();

    // Dynamic group buckets — one per event targetGroup
    const groups: Record<string, { yes: number; people: { player_id: string; name: string }[] }> = {};
    const absent: { player_id: string; name: string }[] = [];

    if (eventTargetGroups.length > 0) {
      // Modern events: bucket by each targetGroup
      for (const tg of eventTargetGroups) {
        groups[tg] = { yes: 0, people: [] };
      }

      attSnap.docs.forEach((d) => {
        const a: any = d.data() || {};
        const pid = d.id;
        const pd = activeById.get(pid);
        if (!pd) return;

        const attending = String(a.attending || "").toUpperCase();
        if (attending !== "YES" && attending !== "NO") return;

        const playerGroups = Array.isArray(pd.groups) ? pd.groups : [];
        const matchingTargetGroups = eventTargetGroups.filter((tg: string) => playerGroups.includes(tg));
        if (matchingTargetGroups.length === 0) return;

        const nm = safeName(a.name) || safeName(pd?.name) || "Unknown";

        if (attending === "YES") {
          for (const tg of matchingTargetGroups) {
            groups[tg].yes += 1;
            groups[tg].people.push({ player_id: pid, name: nm });
          }
        } else {
          // NO — flat absent list (one entry per player regardless of group count)
          if (!absent.some((x) => x.player_id === pid)) {
            absent.push({ player_id: pid, name: nm });
          }
        }
      });

      // Stable ordering per group
      for (const tg of eventTargetGroups) {
        groups[tg].people.sort((a, b) => a.name.localeCompare(b.name));
      }
    } else {
      // Legacy events (no targetGroups): fallback to deriveCategory Men/Women buckets
      groups["Men"] = { yes: 0, people: [] };
      groups["Women"] = { yes: 0, people: [] };

      attSnap.docs.forEach((d) => {
        const a: any = d.data() || {};
        const pid = d.id;
        const pd = activeById.get(pid);
        if (!pd) return;

        const attending = String(a.attending || "").toUpperCase();
        if (attending !== "YES" && attending !== "NO") return;

        const category = deriveCategory(pd.gender, pd.hasPaymentManager, pd.group, pd.groups);
        const bucketName = category === "women" ? "Women" : "Men";
        const nm = safeName(a.name) || safeName(pd?.name) || "Unknown";

        if (attending === "YES") {
          groups[bucketName].yes += 1;
          groups[bucketName].people.push({ player_id: pid, name: nm });
        } else {
          if (!absent.some((x) => x.player_id === pid)) {
            absent.push({ player_id: pid, name: nm });
          }
        }
      });

      groups["Men"].people.sort((a, b) => a.name.localeCompare(b.name));
      groups["Women"].people.sort((a, b) => a.name.localeCompare(b.name));
    }

    absent.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ groups, absent });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 401 });
  }
}
