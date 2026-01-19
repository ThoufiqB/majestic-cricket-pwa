export type EventInfo = {
  event_id: string;
  title: string;
  event_type: string;
  group?: string;
  starts_at: string;
  fee: number;
  status: string;
};

export type PaidStatus = "UNPAID" | "PENDING" | "PAID" | "REJECTED";

export type PlayerAttendanceRow = {
  player_id: string;

  // backend may send any/all of these
  full_name?: string;
  name?: string;
  email?: string;

  attending: "YES" | "NO" | "UNKNOWN";
  attended: boolean;

  paid_status: PaidStatus;
  fee_due?: number | string;

  updated_at?: string;
};

export type Totals = {
  baseFee: number;
  yesCount: number;
  expectedSum: number;
  paidConfirmedSum: number;
  pendingSum: number;
  paidCount: number;
  pendingCount: number;
  rejectedCount: number;
  unpaidCount: number;
};
