/**
 * Calculate the fee a user should pay based on their member type
 * Students get 25% discount
 *
 * @param baseFee - The base event fee set by admin
 * @param memberType - User's membership type ("standard" | "student")
 * @returns The calculated fee (discounted for students)
 */
export function calculateFee(baseFee: number, memberType: string | undefined | null): number {
  const type = String(memberType || "standard").toLowerCase();
  const fee = Number(baseFee || 0);
  return type === "student" ? fee * 0.75 : fee;
}

/**
 * Check if user qualifies for student discount
 */
export function isStudentDiscount(memberType: string | undefined | null): boolean {
  return String(memberType || "").toLowerCase() === "student";
}

const YOUTH_GROUPS = new Set(["U-13", "U-15", "U-18"]);

/**
 * Returns true when every targetGroup on the event is a youth/kids category.
 * These events already have the youth price baked in — no further discounting.
 */
function isYouthOnlyEvent(targetGroups: string[]): boolean {
  if (!targetGroups || targetGroups.length === 0) return false;
  return targetGroups.every((g) => YOUTH_GROUPS.has(g) || g === "Kids");
}

/**
 * Calculate the fee a player should pay, respecting event targeting rules.
 *
 * Rules:
 *  1. Youth-only events (targetGroups ⊆ U-13/U-15/U-18/Kids)
 *     → price is already the youth price; return baseFee as-is.
 *  2. Mixed events that include Men/Women alongside youth:
 *     → Youth players (U-13/U-15/U-18 in their groups) pay 25% off.
 *     → Adult students (member_type === "student") pay 25% off.
 *     → Adult standard players pay full price.
 *
 * @param baseFee          - The base event fee set by admin
 * @param memberType       - Player's membership type ("standard" | "student")
 * @param playerGroups     - Player's own groups array e.g. ["U-13"] or ["Men"]
 * @param eventTargetGroups - The event's targetGroups array e.g. ["Men", "U-13"]
 */
export function calculateEventFee(
  baseFee: number,
  memberType: string | undefined | null,
  playerGroups: string[],
  eventTargetGroups: string[]
): number {
  const fee = Number(baseFee || 0);

  // Rule 1: Youth-only event — fee is already set for youth, no discount
  if (isYouthOnlyEvent(eventTargetGroups)) return fee;

  // Rule 2: Mixed event — youth players always get 25% off
  if ((playerGroups || []).some((g) => YOUTH_GROUPS.has(g))) return fee * 0.75;

  // Rule 2: Mixed event — adult students get 25% off
  if (String(memberType || "").toLowerCase() === "student") return fee * 0.75;

  return fee;
}

/**
 * Returns true when the player should see a "discounted" label for this event.
 */
export function isDiscountApplied(
  memberType: string | undefined | null,
  playerGroups: string[],
  eventTargetGroups: string[]
): boolean {
  if (isYouthOnlyEvent(eventTargetGroups)) return false;
  if ((playerGroups || []).some((g) => YOUTH_GROUPS.has(g))) return true;
  return String(memberType || "").toLowerCase() === "student";
}
