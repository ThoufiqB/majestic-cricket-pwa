import { requireSessionUser } from "@/lib/requireSession";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { eventId } = await ctx.params;
    const id = String(eventId || "");
    if (!id) {
      return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const kidId: string | null = body?.kid_id ? String(body.kid_id) : null;
    const linkedYouthId: string | null = body?.linked_youth_id ? String(body.linked_youth_id) : null;

    // Fetch the event and compute the attendance cut-off.
    const eventSnap = await adminDb.collection("events").doc(id).get();
    const eventData: any = eventSnap.data();
    if (!eventData) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const explicitCutoff =
      typeof eventData.attendance_cutoff_hours === "number"
        ? Number(eventData.attendance_cutoff_hours)
        : null;
    const isNetPractice = String(eventData?.event_type || "").toLowerCase() === "net_practice";
    const cutOffHours = explicitCutoff !== null ? explicitCutoff : (isNetPractice ? 48 : 0);

    if (cutOffHours <= 0) {
      return NextResponse.json(
        { error: "Participation requests not permitted for this event" },
        { status: 400 }
      );
    }

    const startsAtValue: any = eventData.starts_at;
    let startsAt: Date;
    if (startsAtValue && typeof startsAtValue.toDate === "function") {
      startsAt = startsAtValue.toDate();
    } else {
      startsAt = new Date(startsAtValue);
    }
    const now = new Date();
    const cutoffTime = new Date(startsAt.getTime() - cutOffHours * 60 * 60 * 1000);

    if (now < cutoffTime) {
      return NextResponse.json({ error: "Cut-off not reached yet" }, { status: 400 });
    }
    if (now >= startsAt) {
      return NextResponse.json({ error: "Event has already started" }, { status: 400 });
    }

    // Determine the subject of the request: adult or kid.
    let requestType: "adult" | "kid" = "adult";
    let subjectId: string = user.uid;
    let subjectName: string = "";

    if (kidId) {
      const kidSnap = await adminDb.collection("kids_profiles").doc(kidId).get();
      const kidData: any = kidSnap.data() || {};
      const isParent = kidData?.parent_id === user.uid || kidData?.player_id === user.uid;
      if (!isParent) {
        return NextResponse.json({ error: "Not authorized to request for this kid" }, { status: 403 });
      }
      requestType = "kid";
      subjectId = kidId;
      subjectName = String(
        kidData?.name || kidData?.first_name || `Kid ${kidId.substring(0, 8)}`
      );
    } else if (linkedYouthId) {
      const sessionPlayerSnap = await adminDb.collection("players").doc(user.uid).get();
      const sessionPlayerData = (sessionPlayerSnap.data() || {}) as any;
      const parentLinkedYouth: string[] = sessionPlayerData.linked_youth || [];
      if (!parentLinkedYouth.includes(linkedYouthId)) {
        return NextResponse.json({ error: "Not authorized to request for this youth" }, { status: 403 });
      }
      subjectId = linkedYouthId;
      const youthSnap = await adminDb.collection("players").doc(linkedYouthId).get();
      subjectName = String(youthSnap.data()?.name || linkedYouthId);
    } else {
      const playerSnap = await adminDb.collection("players").doc(user.uid).get();
      const playerData: any = playerSnap.data() || {};
      subjectName = String(playerData?.name || user.name || "");
    }

    const docId = `${id}_${subjectId}`;
    const reqRef = adminDb.collection("participation_requests").doc(docId);
    const reqSnap = await reqRef.get();

    if (reqSnap.exists) {
      return NextResponse.json({ error: "Participation request already exists" }, { status: 400 });
    }

    await reqRef.set({
      event_id: id,
      subject_id: subjectId,
      subject_name: subjectName,
      type: requestType,
      requested_by: user.uid,
      requested_at: adminTs.now(),
      status: "pending",
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

/**
 * ✅ NEW: GET /api/events/{eventId}/request?kid_id=...
 * Returns whether a participation request already exists for this user/kid.
 * This is used by UI to grey-out the button even after refresh.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { eventId } = await ctx.params;
    const id = String(eventId || "");
    if (!id) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const url = new URL(req.url);
    const kidIdRaw = url.searchParams.get("kid_id");
    const kidId = kidIdRaw ? String(kidIdRaw) : null;
    const linkedYouthIdRaw = url.searchParams.get("linked_youth_id");
    const linkedYouthId = linkedYouthIdRaw ? String(linkedYouthIdRaw) : null;

    let subjectId = user.uid;

    if (kidId) {
      // Verify parent before revealing existence
      const kidSnap = await adminDb.collection("kids_profiles").doc(kidId).get();
      const kidData: any = kidSnap.data() || {};
      const isParent = kidData?.parent_id === user.uid || kidData?.player_id === user.uid;
      if (!isParent) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
      subjectId = kidId;
    } else if (linkedYouthId) {
      const sessionPlayerSnap = await adminDb.collection("players").doc(user.uid).get();
      const sessionPlayerData = (sessionPlayerSnap.data() || {}) as any;
      const parentLinkedYouth: string[] = sessionPlayerData.linked_youth || [];
      if (!parentLinkedYouth.includes(linkedYouthId)) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }
      subjectId = linkedYouthId;
    }

    const docId = `${id}_${subjectId}`;
    const reqSnap = await adminDb.collection("participation_requests").doc(docId).get();

    return NextResponse.json({
      exists: reqSnap.exists,
      status: reqSnap.exists ? String(reqSnap.data()?.status || "pending") : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
