import type { HomeEvent } from "./types";

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}
export function monthKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
export function monthLabelFromKey(key: string) {
  const [y, m] = key.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, 1));
  return dt.toLocaleString(undefined, { month: "short", year: "numeric" });
}
export function buildMonthOptions(count: number = 7) {
  const now = new Date();
  const opts: { key: string; label: string }[] = [];
  for (let i = -1; i < count - 1; i++) {
    const d = new Date(now);
    d.setMonth(now.getMonth() + i);
    const key = monthKeyFromDate(d);
    opts.push({ key, label: monthLabelFromKey(key) });
  }
  const seen = new Set<string>();
  return opts.filter((o) => (seen.has(o.key) ? false : (seen.add(o.key), true)));
}

export function isProfileComplete(m: any) {
  const g = String(m?.group || "").trim().toLowerCase();
  const mt = String(m?.member_type || "").trim().toLowerCase();
  return (g === "men" || g === "women") && (mt === "standard" || mt === "student");
}

export function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function isMembershipEvent(ev: HomeEvent) {
  return String(ev.event_type || "").toLowerCase() === "membership_fee";
}

export function paidLabel(paid_status: any) {
  const s = String(paid_status || "UNPAID").toUpperCase();
  if (s === "PAID") return "PAID ✅";
  if (s === "PENDING") return "Pending Confirmation ⏳";
  if (s === "REJECTED") return "Rejected ❌";
  return "Unpaid ❌";
}
