import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

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
    const evGroup = String(ev.group || "").toLowerCase();

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
        kids: { yes: kids.length, total: kids.length, people: kids }
      });
    }

    // For adult events, fetch active players and group by men/women
    const activeById = new Map<string, any>();
    const playersSnap = await adminDb.collection("players").get();
    playersSnap.docs.forEach((d) => {
      const status = String((d.data() as any)?.status || "active").toLowerCase();
      if (status !== "inactive") {
        activeById.set(d.id, d.data() || {});
      }
    });

    const attSnap = await adminDb.collection("events").doc(id).collection("attendees").get();

    const out = {
      men: { yes: 0, total: 0, people: [] as { player_id: string; name: string }[] },
      women: { yes: 0, total: 0, people: [] as { player_id: string; name: string }[] },
    };

    // totals are based on eligible players for that event
    for (const [pid, pd] of activeById.entries()) {
      const g = String(pd.group || "").toLowerCase();
      if (g !== "men" && g !== "women") continue;

      const eligible =
        evGroup === "mixed" ? true :
        evGroup === "men" ? g === "men" :
        evGroup === "women" ? g === "women" :
        true;

      if (!eligible) continue;
      out[g as "men" | "women"].total += 1;
    }

    // YES names are from attendees docs
    attSnap.docs.forEach((d) => {
      const a: any = d.data() || {};
      const pid = d.id;

      const pd = activeById.get(pid);
      const g = String(pd?.group || a.group || "").toLowerCase();
      if (g !== "men" && g !== "women") return;

      // respect event eligibility
      const eligible =
        evGroup === "mixed" ? true :
        evGroup === "men" ? g === "men" :
        evGroup === "women" ? g === "women" :
        true;

      if (!eligible) return;

      const attending = String(a.attending || "").toUpperCase();
      if (attending !== "YES") return;

      const nm = safeName(a.name) || safeName(pd?.name) || "Unknown";
      out[g as "men" | "women"].yes += 1;
      out[g as "men" | "women"].people.push({ player_id: pid, name: nm });
    });

    // stable ordering
    out.men.people.sort((a, b) => a.name.localeCompare(b.name));
    out.women.people.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 401 });
  }
}
