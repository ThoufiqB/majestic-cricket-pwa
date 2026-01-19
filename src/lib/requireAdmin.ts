// src/lib/requireAdmin.ts
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSessionUser } from "@/lib/requireSession";

function normEmail(s: string) {
  return String(s || "").trim().toLowerCase();
}

export async function requireAdminUser() {
  const u = await requireSessionUser();
  const uid = u.uid;

  const snap = await adminDb.collection("players").doc(uid).get();
  if (!snap.exists) throw new Error("Not registered");

  const me = { player_id: snap.id, ...(snap.data() as any) };
  const role = String(me.role || "player").toLowerCase();
  if (role !== "admin") throw new Error("Forbidden");

  // keep email normalized for safety
  me.email = normEmail(me.email);

  return { user: u, me };
}
