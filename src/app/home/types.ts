// Lean per-group attendance count embedded in each event (pre-loaded with the events list)
export type FriendsSummary = Record<string, { yes: number }>;

// Full modal data fetched on-demand when the Friends Going modal is opened
export type GroupAttendance = {
  yes: number;
  people: { player_id: string; name: string }[];
};

export type FriendsGoing = {
  groups: Record<string, GroupAttendance>;
  absent: { player_id: string; name: string }[];
};

export type HomeEvent = {
  event_id: string;
  title: string;
  event_type: string;
  group: string;
  starts_at: string;
  fee: number;
  status: string;
  year?: number;
  kids_event?: boolean;
  targetGroups?: string[];
  /** Pre-loaded YES counts per target group — used for the summary line on each event card */
  friendsSummary?: FriendsSummary;
  my?: {
    attending: "YES" | "NO" | "UNKNOWN";
    attended: boolean;
    paid_status: "PAID" | "UNPAID" | "PENDING" | "REJECTED";
    fee_due?: number | string;
  };
};

export type PaymentRecord = {
  event_id: string;
  event_name: string;
  event_date: string | null;
  profile_id: string;
  profile_name: string;
  amount: number;
  cost: number;
  status: "paid" | "pending" | "unpaid" | "rejected";
  marked_at: string | null;
  confirmed_at: string | null;
  fee_due: number | null;
};

export type PaymentSummary = {
  success: boolean;
  summary: {
    total_paid: number;
    total_pending: number;
    total_unpaid: number;
    total_rejected: number;
    count_paid: number;
    count_pending: number;
    count_unpaid: number;
    count_rejected: number;
  };
  payments: PaymentRecord[];
};

