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
      monthOfBirth, // 1–12, optional (null for existing users)
      gender,
      member_type, 
      phone,
      hasPaymentManager,
      paymentManagerId,
      paymentManagerName,
      gdprConsent,
      gdprConsentAt,
    } = body;

    // GDPR consent is mandatory
    if (gdprConsent !== true) {
      return NextResponse.json(
        { error: "GDPR consent is required to complete registration" },
        { status: 400 }
      );
    }

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

    // monthOfBirth is optional for backward compat but validated when provided
    if (
      monthOfBirth !== undefined &&
      monthOfBirth !== null &&
      (!Number.isInteger(monthOfBirth) || monthOfBirth < 1 || monthOfBirth > 12)
    ) {
      return NextResponse.json(
        { error: "Month of birth must be between 1 and 12" },
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

    // Validate groups — must be known values
    const validGroups = ["Men", "Women", "U-13", "U-15", "U-18"];
    const invalidGroups = (groups as string[]).filter((g) => !validGroups.includes(g));
    if (invalidGroups.length > 0) {
      return NextResponse.json(
        { error: `Invalid groups: ${invalidGroups.join(", ")}` },
        { status: 400 }
      );
    }

    // Age validation (month-accurate when monthOfBirth is provided)
    // Run BEFORE the later age check so we have `age` available here.
    const _now = new Date();
    const _cy = _now.getFullYear();
    const _cm = _now.getMonth() + 1;
    const ageForGroupCheck = monthOfBirth
      ? _cy - yearOfBirth - (_cm < monthOfBirth ? 1 : 0)
      : _cy - yearOfBirth;

    // Group eligibility server-side check
    const youthGroups = ["U-13", "U-15", "U-18"];
    const adultGroups = ["Men", "Women"];

    if (ageForGroupCheck >= 18) {
      // Adults cannot register in youth groups without an override
      // (allowed for coaches; no hard block — admin can always change later)
      // Adults MUST include at least one adult group
      const hasAdult = (groups as string[]).some((g) => adultGroups.includes(g));
      if (!hasAdult) {
        return NextResponse.json(
          { error: "Adults (18+) must include at least one adult group (Men or Women)" },
          { status: 400 }
        );
      }
    } else {
      // Under 18: must not include adult groups
      const hasAdultGroup = (groups as string[]).some((g) => adultGroups.includes(g));
      if (hasAdultGroup) {
        return NextResponse.json(
          { error: "Players under 18 cannot register in Men or Women groups" },
          { status: 400 }
        );
      }
      // Enforce age-tier eligibility
      const selectedYouth = (groups as string[]).filter((g) => youthGroups.includes(g));
      for (const g of selectedYouth) {
        if (g === "U-13" && ageForGroupCheck > 13) {
          // U-13 is open to all under-18 (lower age tiers can still play)
          // No restriction — admin can always adjust post-approval
        }
        if (g === "U-15" && ageForGroupCheck <= 13) {
          return NextResponse.json(
            { error: `Age ${ageForGroupCheck} is not eligible for U-15 (requires 14+)` },
            { status: 400 }
          );
        }
        if (g === "U-18" && ageForGroupCheck < 14) {
          return NextResponse.json(
            { error: `Age ${ageForGroupCheck} is not eligible for U-18 (requires 14+)` },
            { status: 400 }
          );
        }
      }
    }

    // Validate member_type
    if (!["standard", "student"].includes(member_type)) {
      return NextResponse.json(
        { error: "Invalid member type. Must be: standard or student" },
        { status: 400 }
      );
    }

    // Age validation (month-accurate when monthOfBirth is provided)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-based
    const age = monthOfBirth
      ? currentYear - yearOfBirth - (currentMonth < monthOfBirth ? 1 : 0)
      : currentYear - yearOfBirth;

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

    // ── Duplicate account check ──────────────────────────────────────────────
    // Prevent a second Google account from re-registering with an email that
    // already belongs to an approved player or an active registration request.
    const normalizedEmail = normEmail(email);

    // 1. Check approved players (different UID, same email)
    const existingPlayerQuery = await adminDb
      .collection("players")
      .where("email", "==", normalizedEmail)
      .limit(5)
      .get();

    const duplicatePlayer = existingPlayerQuery.docs.find((d) => d.id !== uid);
    if (duplicatePlayer) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. If you believe this is a mistake, please contact an admin.",
          code: "duplicate_email",
        },
        { status: 409 }
      );
    }

    // 2. Check active registration requests (different UID, same email, non-rejected status)
    const rejectedStatuses: RegistrationStatus[] = ["rejected", "rejected_by_parent"];
    const existingRequestQuery = await adminDb
      .collection("registration_requests")
      .where("email", "==", normalizedEmail)
      .limit(5)
      .get();

    const duplicateRequest = existingRequestQuery.docs.find(
      (d) => d.id !== uid && !rejectedStatuses.includes(d.data().status as RegistrationStatus)
    );
    if (duplicateRequest) {
      return NextResponse.json(
        {
          error:
            "A registration request with this email is already pending or approved. If you believe this is a mistake, please contact an admin.",
          code: "duplicate_email",
        },
        { status: 409 }
      );
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Check if player already exists (approved user updating profile)
    const playerRef = adminDb.collection("players").doc(uid);
    const playerSnap = await playerRef.get();

    if (playerSnap.exists) {
      // Existing approved player - update their profile
      const updateData: any = {
        groups,
        yearOfBirth,
        monthOfBirth: monthOfBirth ?? null,
        gender,
        member_type,
        phone,
        hasPaymentManager: hasPaymentManager || false,
        profile_completed: true,
        profile_completed_at: adminTs.now(),
        updated_at: adminTs.now(),
        gdprConsent: true,
        gdprConsentAt: gdprConsentAt ?? new Date().toISOString(),
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

    // Determine if this is a youth registration (under 18 with a payment manager)
    const isYouthRegistration = age < 18 && hasPaymentManager && paymentManagerId;

    // Youth → pending_parent_approval first; Adults → pending (straight to admin)
    const initialStatus: RegistrationStatus = isYouthRegistration
      ? "pending_parent_approval"
      : "pending";

    const requestData: any = {
      uid,
      email: normEmail(email),
      name,
      groups,
      yearOfBirth,
      monthOfBirth: monthOfBirth ?? null,
      gender,
      member_type,
      phone,
      hasPaymentManager: hasPaymentManager || false,
      status: initialStatus,
      requested_at: adminTs.now(),
      gdprConsent: true,
      gdprConsentAt: gdprConsentAt ?? new Date().toISOString(),
    };

    if (hasPaymentManager) {
      requestData.paymentManagerId = paymentManagerId;
      requestData.paymentManagerName = paymentManagerName;
    }

    if (requestSnap.exists) {
      // Update existing rejected/pending request (resubmission)
      await requestRef.update({
        ...requestData,
        resubmitted_at: adminTs.now(),
        resubmission_count: (requestSnap.data()?.resubmission_count || 0) + 1,
      });
    } else {
      // Create new registration request
      await requestRef.set(requestData);
    }

    // For youth: also create a parent_requests doc to notify the payment manager
    if (isYouthRegistration) {
      const parentRequestRef = adminDb.collection("parent_requests").doc();
      await parentRequestRef.set({
        id: parentRequestRef.id,
        youth_uid: uid,
        youth_name: name,
        youth_email: normEmail(email),
        youth_groups: groups,
        parent_uid: paymentManagerId,
        status: "pending",
        created_at: adminTs.now(),
      });

      return NextResponse.json({
        ok: true,
        status: "pending_parent_approval",
        message: "Registration submitted. Your parent/guardian must approve first before admin review.",
      });
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
