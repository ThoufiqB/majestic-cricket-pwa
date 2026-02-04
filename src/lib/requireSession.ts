import { cookies } from "next/headers";
import { adminAuth, adminDb } from "./firebaseAdmin";
import type { PlayerStatus } from "./types/auth";

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "mc_session";

export type SessionUser = {
  uid: string;
  email: string;
  name?: string;
};

/**
 * Verify session cookie and ensure player has active status
 * Throws error if:
 * - No session cookie
 * - Invalid session cookie
 * - Player document doesn't exist
 * - Player status is not "active" (disabled/removed)
 */
export async function requireSessionUser(): Promise<SessionUser> {
  // Next 16+ cookies() is async
  const jar = await cookies();
  const c = jar.get(COOKIE_NAME)?.value;

  if (!c) throw new Error("Missing auth");

  const decoded = await adminAuth.verifySessionCookie(c, true);

  // Check player document exists and has active status
  const playerRef = adminDb.collection("players").doc(decoded.uid);
  const playerSnap = await playerRef.get();

  if (!playerSnap.exists) {
    throw new Error("Account not found");
  }

  const playerData = playerSnap.data();
  const status = playerData?.status as PlayerStatus | undefined;

  // Check status
  if (status === "disabled") {
    throw new Error("Account disabled");
  }

  if (status === "removed") {
    throw new Error("Account removed");
  }

  // If status field doesn't exist or is not "active", treat as error
  // (After migration, all players should have status: "active")
  if (status !== "active") {
    throw new Error("Account not active");
  }

  return {
    uid: decoded.uid,
    email: String((decoded as any).email || ""),
    name: String((decoded as any).name || ""),
  };
}
