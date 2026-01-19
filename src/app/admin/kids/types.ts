export interface LinkedParent {
  parent_uid: string;
  linked_by: string;
  linked_at: Date | string;
}

export interface KidProfile {
  kid_id: string;
  name: string;
  date_of_birth: string; // YYYY-MM-DD
  age: number;
  player_id: string;
  parent_emails: string[];
  status: "active" | "inactive";
  created_at: Date | string;
  updated_at: Date | string;
  created_by: string;
  linked_parents: LinkedParent[];
}

export interface EnhancedKidProfile extends KidProfile {
  event_count: number;
}

export interface CreateKidInput {
  parent_email: string;
  name: string;
  date_of_birth: string; // YYYY-MM-DD
}

export interface UpdateKidInput {
  name?: string;
  date_of_birth?: string; // YYYY-MM-DD
}

export interface LinkParentInput {
  secondary_parent_email: string;
}
