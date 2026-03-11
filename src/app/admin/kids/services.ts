import { apiGet, apiPost, apiPatch } from "@/app/client/api";
import type { KidProfile, CreateKidInput, UpdateKidInput, LinkParentInput } from "./types";

export async function adminListKids(
  parentEmail?: string
): Promise<{ kids: KidProfile[]; count: number }> {
  const url = parentEmail
    ? `/api/admin/kids/list?parent_email=${encodeURIComponent(parentEmail)}`
    : "/api/admin/kids/list";
  return apiGet(url);
}

export async function adminCreateKid(input: CreateKidInput): Promise<{ kid_id: string; success: boolean }> {
  return apiPost("/api/admin/kids/create", {
    parent_email: input.parent_email,
    name: input.name,
    year_of_birth: input.yearOfBirth,
    month_of_birth: input.monthOfBirth,
  });
}

export async function adminUpdateKid(
  kidId: string,
  input: UpdateKidInput
): Promise<{ success: boolean; kid: KidProfile }> {
  const body: Record<string, any> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.yearOfBirth !== undefined) body.year_of_birth = input.yearOfBirth;
  if (input.monthOfBirth !== undefined) body.month_of_birth = input.monthOfBirth;
  return apiPatch(`/api/admin/kids/${encodeURIComponent(kidId)}`, body);
}

export async function adminLinkParent(
  kidId: string,
  input: LinkParentInput
): Promise<{ success: boolean; linked_at: string }> {
  return apiPatch(`/api/admin/kids/${encodeURIComponent(kidId)}/link-parent`, input);
}

export async function adminDeactivateKid(kidId: string): Promise<{ success: boolean; deactivated_at: string }> {
  return apiPatch(`/api/admin/kids/${encodeURIComponent(kidId)}/deactivate`, {});
}

export async function adminReactivateKid(kidId: string): Promise<{ success: boolean; reactivated_at: string }> {
  return apiPatch(`/api/admin/kids/${encodeURIComponent(kidId)}/reactivate`, {});
}
