/**
 * Centralized date/time formatting utilities
 * Standard format: "08 Mar 2026, 6:00 PM"
 */

/**
 * Format datetime for display: "08 Mar 2026, 6:00 PM"
 * - Date: DD MMM YYYY (with leading zero)
 * - Time: H:MM AM/PM (12-hour, no seconds)
 * - Separator: Comma + space
 */
export function formatEventDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  
  // Date part: "08 Mar 2026"
  const datePart = date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  
  // Time part: "6:00 PM"
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  
  // Combine with comma
  return `${datePart}, ${timePart}`;
}
