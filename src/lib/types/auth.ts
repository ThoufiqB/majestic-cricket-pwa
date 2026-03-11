// Authentication and authorization types

/**
 * Player account status
 * - active: Normal access to the app
 * - disabled: Temporarily disabled by admin
 * - removed: Soft deleted by admin
 */
export type PlayerStatus = "active" | "disabled" | "removed";

/**
 * Registration request status
 * - pending:                  Adult waiting for admin approval
 * - pending_parent_approval:  Youth player — awaiting designated parent/guardian approval first
 * - pending_admin_approval:   Parent approved — now waiting for admin
 * - approved:                 Admin approved (player document created)
 * - rejected:                 Admin rejected
 * - rejected_by_parent:       Parent declined the profile-manager request
 */
export type RegistrationStatus =
  | "pending"
  | "pending_parent_approval"
  | "pending_admin_approval"
  | "approved"
  | "rejected"
  | "rejected_by_parent";

/**
 * Parent request status — tracks the youth→parent approval step.
 * Stored in the `parent_requests` Firestore collection.
 */
export type ParentRequestStatus = "pending" | "approved" | "rejected";

/**
 * A request from a self-registered youth player asking an adult to
 * become their Profile Manager / Payment Manager.
 */
export interface ParentRequest {
  id: string;                   // Firestore doc ID (auto-generated)
  youth_uid: string;            // UID of the self-registered youth player
  youth_name: string;
  youth_email: string;
  youth_groups: string[];       // e.g. ["U-15"]
  parent_uid: string;           // UID of the designated payment manager
  status: ParentRequestStatus;
  created_at: Date | FirebaseFirestore.Timestamp;
  resolved_at?: Date | FirebaseFirestore.Timestamp;
  resolved_by?: string;         // parent UID who acted on it
  rejection_reason?: string;
}

/**
 * Rejection reason types for structured rejection handling
 */
export type RejectionReason = 
  | "incorrect_info" 
  | "incomplete" 
  | "wrong_group" 
  | "duplicate" 
  | "other";

/**
 * Registration request document structure
 */
export interface RegistrationRequest {
  uid: string;
  email: string;
  name: string;
  status: RegistrationStatus;
  requested_at: Date | FirebaseFirestore.Timestamp;
  
  // Registration form data
  group?: string;
  member_type?: string;
  phone?: string;
  
  // NEW: Multi-group registration
  groups?: string[];
  yearOfBirth?: number;
  monthOfBirth?: number; // 1–12 (no full date for privacy)
  gender?: "Male" | "Female";
  hasPaymentManager?: boolean;
  paymentManagerId?: string;
  paymentManagerName?: string;
  
  // If approved
  approved_by?: string;
  approved_at?: Date | FirebaseFirestore.Timestamp;
  player_id?: string;
  
  // If rejected
  rejected_by?: string;
  rejected_at?: Date | FirebaseFirestore.Timestamp;
  rejection_reason?: string;
  rejection_notes?: string;
  can_resubmit?: boolean;
  
  // Rejection history tracking
  rejection_history?: Array<{
    rejected_by: string;
    rejected_at: Date | FirebaseFirestore.Timestamp;
    reason: string;
    notes?: string;
  }>;
  
  // Resubmission tracking
  resubmission_count?: number;
  last_rejection_reason?: string;
  last_rejected_at?: Date | FirebaseFirestore.Timestamp;
}

/**
 * Extended player data with status management fields
 */
export interface PlayerWithStatus {
  player_id: string;
  email: string;
  name: string;
  role: "player" | "admin";
  status: PlayerStatus;
  
  // NEW: Multi-group support
  groups?: string[];  // ["Men", "Women", "U-13", "U-15", "U-18"]
  
  // NEW: Year of birth (for age validation)
  yearOfBirth?: number;
  monthOfBirth?: number; // 1–12 (no full date for privacy)
  
  // NEW: Payment Manager (for youth players)
  hasPaymentManager?: boolean;
  paymentManagerId?: string | null;
  paymentManagerName?: string | null;
  
  // DEPRECATED (keep for backward compatibility)
  group?: string;
  member_type?: string;
  phone?: string;
  
  // Approval tracking
  approved_by?: string;
  approved_at?: Date | FirebaseFirestore.Timestamp;
  
  // Disable tracking
  disabled_by?: string;
  disabled_at?: Date | FirebaseFirestore.Timestamp;
  disabled_reason?: string;
  
  // Remove tracking
  removed_by?: string;
  removed_at?: Date | FirebaseFirestore.Timestamp;
  removal_reason?: string;
  
  // Re-enable tracking
  reactivated_by?: string;
  reactivated_at?: Date | FirebaseFirestore.Timestamp;
  
  created_at: Date | FirebaseFirestore.Timestamp;
  updated_at: Date | FirebaseFirestore.Timestamp;
}
