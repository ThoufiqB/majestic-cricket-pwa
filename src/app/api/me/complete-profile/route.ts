import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminTs } from "@/lib/firebaseAdmin";
import type { RegistrationStatus } from "@/lib/types/auth";

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}

/**
 * PUT /api/me/complete-profile
 * Submit registration request with profile details (for new users)
 * OR update existing player profile (if already approved)
 * Body: { groups, yearOfBirth, member_type, phone, hasPaymentManager, paymentManagerId, paymentManagerName }
 */
export async function PUT(req: NextRequest) {
  try {
    // Get ID token from Authorization header (since user may not have session yet)
    const authHeader = req.headers.get("authorization");
    
    let uid: string;
    let email: string;
    let name: string;

    if (authHeader?.startsWith("Bearer ")) {
      // New user flow - using ID token
      const idToken = authHeader.substring(7);
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      uid = decodedToken.uid;
      email = String(decodedToken.email || "").toLowerCase();
      name = String(decodedToken.name || "");
    } else {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { 
      groups, 
      yearOfBirth, 
      gender,
      member_type, 
      phone,
      hasPaymentManager,
      paymentManagerId,
      paymentManagerName,
    } = body;

    // Validation
    if (!Array.isArray(groups) || groups.length === 0) {
      return NextResponse.json(
        { error: "At least one group must be selected" },
        { status: 400 }
      );
    }

    if (!yearOfBirth || !Number.isInteger(yearOfBirth)) {
      return NextResponse.json(
        { error: "Valid year of birth is required" },
        { status: 400 }
      );
    }

    if (!gender || !["Male", "Female"].includes(gender)) {
      return NextResponse.json(
        { error: "Gender is required (Male or Female)" },
        { status: 400 }
      );
    }

    if (!member_type || !phone) {
      return NextResponse.json(
        { error: "Missing required fields: member_type, phone" },
        { status: 400 }
      );
    }

    // Validate groups
    const validGroups = ["Men", "Women", "U-13", "U-15", "U-18"];
    const invalidGroups = groups.filter((g: string) => !validGroups.includes(g));
    if (invalidGroups.length > 0) {
      return NextResponse.json(
        { error: `Invalid groups: ${invalidGroups.join(", ")}` },
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

    // Age validation
    const currentYear = new Date().getFullYear();
    const age = currentYear - yearOfBirth;

    if (age < 18 && !hasPaymentManager) {
      return NextResponse.json(
        { error: "Players under 18 must have a payment manager" },
        { status: 400 }
      );
    }

    if (hasPaymentManager && !paymentManagerId) {
      return NextResponse.json(
        { error: "Payment manager ID is required when hasPaymentManager is true" },
        { status: 400 }
      );
    }

    // Verify payment manager exists and is active
    if (hasPaymentManager && paymentManagerId) {
      const pmRef = adminDb.collection("players").doc(paymentManagerId);
      const pmSnap = await pmRef.get();
      
      if (!pmSnap.exists || pmSnap.data()?.status !== "active") {
        return NextResponse.json(
          { error: "Payment manager not found or not active. They must register first." },
          { status: 400 }
        );
      }
    }

    // Check if player already exists (approved user updating profile)
    const playerRef = adminDb.collection("players").doc(uid);
    const playerSnap = await playerRef.get();

    if (playerSnap.exists) {
      // Existing approved player - update their profile
      const updateData: any = {
        groups,
        yearOfBirth,
        gender,
        member_type,
        phone,
        hasPaymentManager: hasPaymentManager || false,
        profile_completed: true,
        profile_completed_at: adminTs.now(),
        updated_at: adminTs.now(),
      };

      if (hasPaymentManager) {
        updateData.paymentManagerId = paymentManagerId;
        updateData.paymentManagerName = paymentManagerName;
      }

      await playerRef.update(updateData);

      return NextResponse.json({
        ok: true,
        message: "Profile updated successfully",
      });
    }

    // NEW USER - Create registration request
    const requestRef = adminDb.collection("registration_requests").doc(uid);
    const requestSnap = await requestRef.get();

    const requestData: any = {
      uid,
      email: normEmail(email),
      name,
      groups,
      yearOfBirth,
      gender,
      member_type,
      phone,
      hasPaymentManager: hasPaymentManager || false,
      status: "pending" as RegistrationStatus,
      requested_at: adminTs.now(),
    };

    if (hasPaymentManager) {
      requestData.paymentManagerId = paymentManagerId;
      requestData.paymentManagerName = paymentManagerName;
    }

    if (requestSnap.exists) {
      // Update existing rejected/pending request
      await requestRef.update({
        ...requestData,
        resubmitted_at: adminTs.now(),
        resubmission_count: (requestSnap.data()?.resubmission_count || 0) + 1,
      });
    } else {
      // Create new registration request
      await requestRef.set(requestData);
    }

    return NextResponse.json({
      ok: true,
      status: "pending_approval",
      message: "Registration submitted successfully. Waiting for admin approval.",
    });
  } catch (e: any) {
    console.error("Error completing profile:", e);
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
