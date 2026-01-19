import { cookies } from "next/headers";
import { adminAuth } from "./firebaseAdmin";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "mc_session";

export type SessionUser = {
  uid: string;
  email: string;
  name?: string;
};

export async function requireSessionUser(): Promise<SessionUser> {
  // Next 16+ cookies() is async
  const jar = await cookies();
  const c = jar.get(COOKIE_NAME)?.value;

  if (!c) throw new Error("Missing auth");

  const decoded = await adminAuth.verifySessionCookie(c, true);

  return {
    uid: decoded.uid,
    email: String((decoded as any).email || ""),
    name: String((decoded as any).name || ""),
  };
}
