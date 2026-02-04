import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminTs } from "@/lib/firebaseAdmin";
import type { PlayerStatus, RegistrationStatus } from "@/lib/types/auth";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json().catch(() => ({}));
  if (!idToken) return NextResponse.json({ error: "Missing idToken" }, { status: 400 });

  // You said: 7 days
  const days = Number(process.env.SESSION_COOKIE_DAYS || 7);
  const expiresIn = days * 24 * 60 * 60 * 1000;

  const cookieName = process.env.SESSION_COOKIE_NAME || "mc_session";
  const isProd = process.env.NODE_ENV === "production";

  try {
    // Verify Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = String(decodedToken.email || "").toLowerCase();
    const name = String(decodedToken.name || "");
    const photo = String((decodedToken as any).picture || "");

    // Check if player document exists
    const playerRef = adminDb.collection("players").doc(uid);
    const playerSnap = await playerRef.get();

    if (!playerSnap.exists) {
      // NEW USER - Handle registration request flow
      const requestRef = adminDb.collection("registration_requests").doc(uid);
      const requestSnap = await requestRef.get();

      if (!requestSnap.exists) {
        // First time requesting access - create registration request
        await requestRef.set({
          uid,
          email,
          name,
          status: "pending" as RegistrationStatus,
          requested_at: adminTs.now(),
        });

        return NextResponse.json(
          {
            status: "pending_approval",
            message: "Your access request has been submitted. An admin will review it shortly.",
          },
          { status: 403 }
        );
      }

      // Registration request exists - check status
      const requestData = requestSnap.data();
      const requestStatus = requestData?.status as RegistrationStatus;

      if (requestStatus === "pending") {
        return NextResponse.json(
          {
            status: "pending_approval",
            message: "Your access request is still pending admin approval.",
          },
          { status: 403 }
        );
      }

      if (requestStatus === "rejected") {
        // Allow re-requesting by updating the request
        // Build update object with only defined values
        const updateData: any = {
          status: "pending" as RegistrationStatus,
          requested_at: adminTs.now(),
        };
        
        // Only include rejection history if it exists
        if (requestData?.rejection_reason) {
          updateData.previous_rejection_reason = requestData.rejection_reason;
        }
        if (requestData?.rejected_at) {
          updateData.previous_rejected_at = requestData.rejected_at;
        }
        if (requestData?.rejected_by) {
          updateData.previous_rejected_by = requestData.rejected_by;
        }
        
        await requestRef.update(updateData);

        return NextResponse.json(
          {
            status: "pending_approval",
            message: "Your access request has been resubmitted for admin review.",
          },
          { status: 403 }
        );
      }

      // Status is "approved" but no player document - edge case
      return NextResponse.json(
        { error: "Account setup error. Please contact admin." },
        { status: 500 }
      );
    }

    // EXISTING PLAYER - Check status
    const playerData = playerSnap.data();
    const playerStatus = playerData?.status as PlayerStatus | undefined;

    if (playerStatus === "disabled") {
      return NextResponse.json(
        {
          status: "disabled",
          message: "Your account has been disabled. Please contact an admin.",
        },
        { status: 403 }
      );
    }

    if (playerStatus === "removed") {
      return NextResponse.json(
        {
          status: "removed",
          message: "Your account has been removed. Please contact an admin.",
        },
        { status: 403 }
      );
    }

    if (playerStatus !== "active") {
      return NextResponse.json(
        { error: "Account status invalid. Please contact admin." },
        { status: 403 }
      );
    }

    // All checks passed - create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookieName, sessionCookie, {
      httpOnly: true,
      secure: isProd, // IMPORTANT: must be false on localhost http
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000),
    });

    return res;
  } catch (err: any) {
    console.error("Session login error:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
