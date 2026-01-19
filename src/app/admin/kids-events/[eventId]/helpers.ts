import type { PaidStatus, PlayerAttendanceRow } from "./types";

export function money(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";
  return x.toFixed(2);
}

export function displayName(r: PlayerAttendanceRow) {
  return String(r.full_name || r.name || r.player_id).trim();
}

export function normalizePaidStatus(x: any): PaidStatus {
  const s = String(x || "UNPAID").toUpperCase();
  if (s === "PAID") return "PAID";
  if (s === "PENDING") return "PENDING";
  if (s === "REJECTED") return "REJECTED";
  return "UNPAID";
}

export function paidLabel(s: PaidStatus) {
  if (s === "PAID") return "Paid ✅";
  if (s === "PENDING") return "Pending Confirmation ⏳";
  if (s === "REJECTED") return "Rejected ❌";
  return "Unpaid ❌";
}
