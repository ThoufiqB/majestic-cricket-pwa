/**
 * Derive user category from gender and payment manager status
 * 
 * This is the single source of truth for categorization logic.
 * Never store the result in the database - always derive at runtime.
 * 
 * @param gender - User's gender ("Male" or "Female")
 * @param hasPaymentManager - Whether user has a payment manager (youth indicator)
 * @param legacyGroup - Fallback for users without gender field (backward compatibility)
 * @returns Category: "men" | "women" | "juniors"
 */
export function deriveCategory(
  gender: "Male" | "Female" | undefined | null,
  hasPaymentManager: boolean | undefined | null,
  legacyGroup?: string | null
): "men" | "women" | "juniors" {
  // Priority 1: Youth with payment manager → Juniors
  if (hasPaymentManager === true) {
    return "juniors";
  }
  
  // Priority 2: Derive from gender
  if (gender === "Male") {
    return "men";
  }
  if (gender === "Female") {
    return "women";
  }
  
  // Priority 3: Fallback to legacy group field (for existing users without gender)
  if (legacyGroup === "women") {
    return "women";
  }
  if (legacyGroup === "juniors") {
    return "juniors";
  }
  
  // Default: men (includes legacy users with group="men" or missing group)
  return "men";
}
