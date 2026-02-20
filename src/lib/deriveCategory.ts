/**
 * Derive the primary display category from a player's stored groups array,
 * gender, and payment-manager status.
 *
 * This is the single source of truth for categorisation logic.
 * Never store the result — always derive at runtime.
 *
 * Priority order:
 *  1. Explicit groups array (new players) — returns the most specific group
 *  2. Payment manager flag (legacy youth indicator) → "juniors"
 *  3. Gender field → "men" | "women"
 *  4. Legacy group string → backward compat
 *  5. Default → "men"
 *
 * @param gender         - "Male" | "Female" | undefined
 * @param hasPaymentManager - legacy youth flag
 * @param legacyGroup    - legacy group field value
 * @param groups         - new multi-group array e.g. ["U-15", "U-18"]
 * @returns Primary category string
 */
export function deriveCategory(
  gender: "Male" | "Female" | undefined | null,
  hasPaymentManager: boolean | undefined | null,
  legacyGroup?: string | null,
  groups?: string[] | null
): string {
  // Priority 1: Use the stored groups array if present
  if (Array.isArray(groups) && groups.length > 0) {
    // Youth tier precedence: most specific (youngest) first
    if (groups.includes("U-13")) return "U-13";
    if (groups.includes("U-15")) return "U-15";
    if (groups.includes("U-18")) return "U-18";
    if (groups.includes("Women")) return "women";
    if (groups.includes("Men")) return "men";
  }

  // Priority 2: Legacy payment-manager flag → juniors bucket
  if (hasPaymentManager === true) {
    return "juniors";
  }

  // Priority 3: Derive from gender
  if (gender === "Male") return "men";
  if (gender === "Female") return "women";

  // Priority 4: Fallback to legacy group field
  if (legacyGroup === "women") return "women";
  if (legacyGroup === "juniors") return "juniors";
  if (legacyGroup === "U-13") return "U-13";
  if (legacyGroup === "U-15") return "U-15";
  if (legacyGroup === "U-18") return "U-18";

  // Default
  return "men";
}
