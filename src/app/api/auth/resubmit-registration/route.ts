import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminTs } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    // Extract ID token from Authorization header (since we don't have session yet)
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Get the form data
    const { group, member_type, phone } = await req.json().catch(() => ({}));

    // Validation
    if (!group || !["men", "women"].includes(group)) {
      return NextResponse.json({ error: "Invalid group" }, { status: 400 });
    }
    if (!member_type || !["standard", "student"].includes(member_type)) {
      return NextResponse.json({ error: "Invalid member type" }, { status: 400 });
    }
    if (!phone || typeof phone !== "string" || phone.trim() === "") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Check registration request exists and is rejected
    const requestRef = adminDb.collection("registration_requests").doc(uid);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
      return NextResponse.json({ error: "No registration request found" }, { status: 404 });
    }

    const requestData = requestSnap.data();
    if (requestData?.status !== "rejected") {
      return NextResponse.json(
        { error: "Registration is not in rejected state" },
        { status: 400 }
      );
    }

    if (requestData?.can_resubmit === false) {
      return NextResponse.json(
        { error: "Resubmission is not allowed for this registration" },
        { status: 403 }
      );
    }

    // Update the registration request with new data and set status to pending
    await requestRef.update({
      status: "pending",
      group,
      member_type,
      phone,
      requested_at: adminTs.now(),
      resubmission_count: (requestData?.resubmission_count || 0) + 1,
      // Keep rejection history for audit
      last_rejection_reason: requestData?.rejection_reason,
      last_rejected_at: requestData?.rejected_at,
      // Clear current rejection fields
      rejection_reason: null,
      rejection_notes: null,
      rejected_by: null,
      rejected_at: null,
    });

    return NextResponse.json({
      ok: true,
      message: "Registration resubmitted successfully. Please wait for admin approval.",
    });
  } catch (err: any) {
    console.error("Resubmit registration error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to resubmit registration" },
      { status: 500 }
    );
  }
}
