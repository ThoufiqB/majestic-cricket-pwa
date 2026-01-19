import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

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
    await adminAuth.verifyIdToken(idToken);

    // Mint session cookie
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
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
