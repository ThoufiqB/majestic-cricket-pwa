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
 * - pending: Waiting for admin approval
 * - approved: Admin approved (player document should exist)
 * - rejected: Admin rejected the request
 */
export type RegistrationStatus = "pending" | "approved" | "rejected";

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
