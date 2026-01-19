/**
 * Calculate age from birth date
 * @param birthDate - Birth date as Date or null
 * @returns Age in years, or null if birthDate is invalid
 */
export function calculateAge(birthDate: Date | null | undefined): number | null {
  if (!birthDate) return null;

  try {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

/**
 * Check if age is within a range
 * @param age - Age in years or null
 * @param minAge - Minimum age (inclusive)
 * @param maxAge - Maximum age (inclusive)
 * @returns True if age is within range, false otherwise
 */
export function isAgeInRange(age: number | null, minAge: number, maxAge: number): boolean {
  if (age === null || age === undefined) return false;
  return age >= minAge && age <= maxAge;
}

/**
 * Get age eligibility message
 * @param age - Current age
 * @param minAge - Minimum allowed age
 * @param maxAge - Maximum allowed age
 * @returns Eligibility message or null if eligible
 */
export function getAgeEligibilityMessage(
  age: number | null,
  minAge: number,
  maxAge: number
): string | null {
  if (age === null) return "Birth date required to verify age eligibility";

  if (age < minAge) {
    return `⚠️ Age ${age} - Too young (Event requires ages ${minAge}-${maxAge})`;
  }

  if (age > maxAge) {
    return `⚠️ Age ${age} - Too old (Event requires ages ${minAge}-${maxAge})`;
  }

  return null;
}
