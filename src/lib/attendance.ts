export function isAttendingYes(data: any): boolean {
  return data?.attending === "YES";
}

/**
 * Attendance confirmation (admin-confirmed).
 * This is the ONLY source of truth for whether someone actually attended.
 */
export function isAttended(data: any): boolean {
  if (typeof data?.attended === "boolean") return data.attended;
  return false;
}

/**
 * Billable means: payment can be requested because attendance is confirmed.
 *
 * IMPORTANT:
 * - "attending === YES" is NOT billable (player intent is not proof)
 * - "attended === true" is billable (admin confirmation)
 */
export function isBillable(data: any): boolean {
  return isAttended(data);
}
