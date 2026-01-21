export function isAttendingYes(data: any): boolean {
  return data?.attending === "YES";
}

export function isAttended(data: any): boolean {
  if (typeof data?.attended === "boolean") return data.attended;
  return false;
}

export function isBillable(data: any): boolean {
  return isAttendingYes(data);
}
