export interface LinkedParent {
  parent_uid: string;
  linked_by: string; // admin email
  linked_at: Date;
}

export interface KidsProfile {
  kid_id: string;
  player_id: string;
  name: string;
  date_of_birth: string; // ISO 8601 (YYYY-MM-DD)
  age: number;
  parent_emails: string[];
  status: "active" | "inactive";
  created_at: Date;
  updated_at: Date;
  created_by: string;
  linked_parents: LinkedParent[];
}

export interface KidsAttendee {
  kid_profile_id: string;
  parent_id: string;
  attending: "YES" | "NO" | "UNKNOWN";
  attended_by_admin: boolean;
  marked_at: Date;
  payment_status: "UNPAID" | "PENDING" | "PAID" | "REJECTED";
  paid_at?: Date;
  paid_by?: string;
  confirmed_by_admin?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
  status: "active" | "inactive";
}

export interface PlayerWithKids {
  player_id: string;
  email: string;
  name: string;
  role: "admin" | "player";
  group: "men" | "women" | "";
  member_type: "standard" | "student" | "";
  phone: string;
  kids_profiles?: KidsProfile[]; // array of full KidsProfile objects
  linked_parents?: Array<{
    parent_uid: string;
    linked_at: Date;
    status: "active" | "pending_approval";
  }>;
  active_profile_id?: string | null; // uid or kid_id, null means "my profile"
  last_login_profile?: string | null;
  created_at: Date;
  updated_at: Date;
}
