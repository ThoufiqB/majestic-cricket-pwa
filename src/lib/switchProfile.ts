import { apiPatch } from "@/app/client/api";
import { toast } from "sonner";

/**
 * Unified profile switch logic for both adult and kid profiles.
 *
 * @param profileId - The profile ID to switch to (player_id for adult, kid_id for kid)
 * @param me - The current user object (must have player_id)
 * @param setContextProfileId - Function to update context profile ID
 * @param refreshProfile - Function to refresh profile context from backend
 * @returns Promise<void>
 */
export async function switchProfile({
  profileId,
  me,
  setContextProfileId,
  refreshProfile,
}: {
  profileId: string;
  me: { player_id: string } | null;
  setContextProfileId: (id: string) => void;
  refreshProfile: () => Promise<void>;
}): Promise<void> {
  try {
    if (!me?.player_id) throw new Error("Missing player_id");
    const switchingToAdult = profileId === me.player_id;
    const targetActiveProfileId = switchingToAdult ? me.player_id : profileId;
    // Persist on backend
    await apiPatch(`/api/kids/${encodeURIComponent(profileId)}/switch-profile`, {
      active_profile_id: targetActiveProfileId,
    });
    setContextProfileId(targetActiveProfileId);
    await refreshProfile();
    toast.success("Switched profile");
  } catch (e) {
    console.error("Failed to switch profile:", e);
    toast.error("Failed to switch profile");
    throw e;
  }
}
