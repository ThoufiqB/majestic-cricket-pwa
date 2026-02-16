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
