import { NextResponse } from "next/server";

export async function POST() {
  const cookieName = process.env.SESSION_COOKIE_NAME || "mc_session";
  const isProd = process.env.NODE_ENV === "production";

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, "", {
    httpOnly: true,
    secure: isProd, // IMPORTANT: must be false on localhost http
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return res;
}
