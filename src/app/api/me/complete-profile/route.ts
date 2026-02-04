import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/requireSession";
import { adminDb, adminTs } from "@/lib/firebaseAdmin";

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}

/**
 * PUT /api/me/complete-profile
 * Update user's profile with required details
 * Body: { group, member_type, phone }
 */
export async function PUT(req: NextRequest) {
  try {
    const u = await requireSessionUser();
    const uid = u.uid;

    const body = await req.json().catch(() => ({}));
    const { group, member_type, phone } = body;

    // Validation
    if (!group || !member_type || !phone) {
      return NextResponse.json(
        { error: "Missing required fields: group, member_type, phone" },
        { status: 400 }
      );
    }

    // Validate group
    if (!["men", "women"].includes(group)) {
      return NextResponse.json(
        { error: "Invalid group. Must be: men or women" },
        { status: 400 }
      );
    }

    // Validate member_type
    if (!["standard", "student"].includes(member_type)) {
      return NextResponse.json(
        { error: "Invalid member type. Must be: standard or student" },
        { status: 400 }
      );
    }

    // Update player document
    const playerRef = adminDb.collection("players").doc(uid);
    const playerSnap = await playerRef.get();

    if (!playerSnap.exists) {
      return NextResponse.json(
        { error: "Player profile not found" },
        { status: 404 }
      );
    }

    await playerRef.update({
      group,
      member_type,
      phone,
      profile_completed: true,
      profile_completed_at: adminTs.now(),
      updated_at: adminTs.now(),
    });

    return NextResponse.json({
      ok: true,
      message: "Profile completed successfully",
    });
  } catch (e: any) {
    console.error("Error completing profile:", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: e?.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
