import { api } from "./client";
import type {
  MemberListResponse,
  MemberDetailResponse,
  MemberFilter,
  CreateMemberInput,
  CreateMemberResponse,
} from "@/lib/types/membership";

/**
 * Get paginated list of members with optional search
 */
export async function getMembers(
  filters?: MemberFilter
): Promise<MemberListResponse> {
  const params = new URLSearchParams();

  if (filters?.search) {
    params.append("search", filters.search);
  }

  if (filters?.limit) {
    params.append("limit", filters.limit.toString());
  }

  if (filters?.offset) {
    params.append("offset", filters.offset.toString());
  }

  const res = await api.get(`/admin/membership/members?${params.toString()}`);

  return res.data as MemberListResponse;
}

/**
 * Get single member details by customer ID
 */
export async function getMemberById(
  customerId: string
): Promise<MemberDetailResponse> {
  const res = await api.get(`/admin/membership/members/${customerId}`);

  return res.data as MemberDetailResponse;
}

/**
 * Create a new member from an existing customer
 */
export async function createMember(
  input: CreateMemberInput
): Promise<CreateMemberResponse> {
  const res = await api.post("/admin/membership/members", input);

  return res.data as CreateMemberResponse;
}

/**
 * Non-member customer type
 */
export type NonMemberCustomer = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
};

export type NonMemberCustomersResponse = {
  customers: NonMemberCustomer[];
  count: number;
  limit: number;
  offset: number;
};

/**
 * Get customers who are not members yet
 */
export async function getNonMemberCustomers(filters?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<NonMemberCustomersResponse> {
  const params = new URLSearchParams();

  if (filters?.search) {
    params.append("search", filters.search);
  }

  if (filters?.limit) {
    params.append("limit", filters.limit.toString());
  }

  if (filters?.offset) {
    params.append("offset", filters.offset.toString());
  }

  const res = await api.get(
    `/admin/customers/non-members?${params.toString()}`
  );

  return res.data as NonMemberCustomersResponse;
}

/**
 * Delete a member's membership
 * This removes the membership and associated data but keeps the customer
 */
export async function deleteMember(
  customerId: string
): Promise<{ id: string; deleted: boolean }> {
  const res = await api.delete(`/admin/membership/members/${customerId}`);

  return res.data as { id: string; deleted: boolean };
}
