import { useEffect, useState } from "react";
import { KID_MESSAGES } from "./constants";
import type { EnhancedKidProfile, CreateKidInput, UpdateKidInput, LinkParentInput } from "./types";
import {
  adminListKids,
  adminCreateKid,
  adminUpdateKid,
  adminLinkParent,
  adminDeactivateKid,
  adminReactivateKid,
} from "./services";

interface UseAdminKidsState {
  kids: EnhancedKidProfile[];
  loading: boolean;
  error?: string;
}

export function useAdminKids() {
  const [state, setState] = useState<UseAdminKidsState>({
    kids: [],
    loading: false,
    error: undefined,
  });

  const fetchKids = async (parentEmail?: string) => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const response = await adminListKids(parentEmail);
      setState((s) => ({ ...s, kids: response.kids as EnhancedKidProfile[] }));
    } catch (e: any) {
      const error = String(e?.message || e || KID_MESSAGES.FETCH_ERROR);
      setState((s) => ({ ...s, error }));
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  };

  const createKid = async (input: CreateKidInput): Promise<string> => {
    try {
      const result = await adminCreateKid(input);
      await fetchKids(); // Refresh list
      return result.kid_id;
    } catch (e: any) {
      throw new Error(e?.message || KID_MESSAGES.CREATE_ERROR);
    }
  };

  const updateKid = async (kidId: string, input: UpdateKidInput): Promise<void> => {
    try {
      await adminUpdateKid(kidId, input);
      await fetchKids(); // Refresh list
    } catch (e: any) {
      throw new Error(e?.message || KID_MESSAGES.UPDATE_ERROR);
    }
  };

  const linkParent = async (kidId: string, parentEmail: string): Promise<void> => {
    try {
      const input: LinkParentInput = { secondary_parent_email: parentEmail };
      await adminLinkParent(kidId, input);
      await fetchKids(); // Refresh list
    } catch (e: any) {
      throw new Error(e?.message || KID_MESSAGES.LINK_ERROR);
    }
  };

  const deactivateKid = async (kidId: string): Promise<void> => {
    try {
      await adminDeactivateKid(kidId);
      await fetchKids(); // Refresh list
    } catch (e: any) {
      throw new Error(e?.message || KID_MESSAGES.DELETE_ERROR);
    }
  };

  const reactivateKid = async (kidId: string): Promise<void> => {
    try {
      await adminReactivateKid(kidId);
      await fetchKids(); // Refresh list
    } catch (e: any) {
      throw new Error(e?.message || KID_MESSAGES.REACTIVATE_ERROR);
    }
  };

  const getKidById = (kidId: string): EnhancedKidProfile | undefined => {
    return state.kids.find((k) => k.kid_id === kidId);
  };

  const searchKids = (query: string): EnhancedKidProfile[] => {
    const q = query.toLowerCase();
    return state.kids.filter((k) => k.name.toLowerCase().includes(q));
  };

  // Initial load
  useEffect(() => {
    fetchKids();
  }, []);

  return {
    kids: state.kids,
    loading: state.loading,
    error: state.error,
    fetchKids,
    createKid,
    updateKid,
    linkParent,
    deactivateKid,
    reactivateKid,
    getKidById,
    searchKids,
  };
}
