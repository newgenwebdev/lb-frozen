/**
 * User Management API Functions
 *
 * API layer for user management operations
 */

import { api } from "./client";
import type { UserAPIListResponse, UserListParams, UserAPI, UserFormData, UserAPIGetResponse } from "../types/user";

/**
 * Fetch all users with pagination and filtering
 * @param params - Query parameters (limit, offset, role, status, q)
 * @returns User list response
 */
export async function getUsers(params: UserListParams = {}): Promise<UserAPIListResponse> {
  const queryParams = new URLSearchParams();

  if (params.limit !== undefined) {
    queryParams.append("limit", params.limit.toString());
  }
  if (params.offset !== undefined) {
    queryParams.append("offset", params.offset.toString());
  }
  if (params.role && params.role !== "all") {
    queryParams.append("role", params.role);
  }
  if (params.status && params.status !== "all") {
    queryParams.append("status", params.status);
  }
  if (params.q) {
    queryParams.append("q", params.q);
  }

  const queryString = queryParams.toString();
  const url = `/admin/users-management${queryString ? `?${queryString}` : ""}`;

  const response = await api.get<UserAPIListResponse>(url);
  return response.data;
}

/**
 * Get a single user by ID
 * @param id - User ID
 * @returns User or null if not found
 */
export async function getUserById(id: string): Promise<UserAPI | null> {
  try {
    const response = await api.get<UserAPIGetResponse>(`/admin/users-management/${id}`);
    return response.data.user;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return null;
  }
}

/**
 * Create a new user
 * @param data - User form data (must include password)
 * @returns Created user
 */
export async function createUser(data: UserFormData & { password: string }): Promise<UserAPI> {
  const response = await api.post<UserAPI>("/admin/users-management", {
    name: data.name,
    email: data.email,
    password: data.password,
    role: data.role.toLowerCase() as "admin" | "owner",
    status: data.status === "active" ? "Active" : "Non Active",
  });
  return response.data;
}

/**
 * Update an existing user
 * @param id - User ID
 * @param data - Partial user form data (only fields to update)
 * @returns Updated user
 */
export async function updateUser(id: string, data: Partial<UserFormData>): Promise<UserAPI> {
  const payload: Record<string, string> = {};
  
  if (data.name !== undefined) payload.name = data.name;
  if (data.email !== undefined) payload.email = data.email;
  if (data.role !== undefined) payload.role = data.role.toLowerCase() as "admin" | "owner";
  if (data.status !== undefined) payload.status = data.status === "active" ? "Active" : "Non Active";

  const response = await api.put<UserAPI>(`/admin/users-management/${id}`, payload);
  return response.data;
}

/**
 * Delete a user
 * @param id - User ID
 * @returns void
 */
export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/admin/users-management/${id}`);
}

// ============================================================
// Current User (Me) API Functions
// ============================================================

/**
 * Current user profile response
 */
export type CurrentUserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
};

/**
 * Get current authenticated user's profile
 * @returns Current user profile
 */
export async function getCurrentUser(): Promise<CurrentUserProfile> {
  const response = await api.get<{ user: CurrentUserProfile }>("/admin/users-management/me");
  return response.data.user;
}

/**
 * Update current user's profile
 * @param data - Partial profile data to update
 * @returns Updated user profile
 */
export async function updateCurrentUser(data: { name?: string; email?: string }): Promise<CurrentUserProfile> {
  const response = await api.put<{ user: CurrentUserProfile }>("/admin/users-management/me", data);
  return response.data.user;
}

/**
 * Change password input
 */
export type ChangePasswordInput = {
  current_password: string;
  new_password: string;
};

/**
 * Change password response
 */
export type ChangePasswordResponse = {
  success: boolean;
  message: string;
};

/**
 * Change current user's password
 * @param data - Current and new password
 * @returns Success response
 */
export async function changePassword(data: ChangePasswordInput): Promise<ChangePasswordResponse> {
  const response = await api.put<ChangePasswordResponse>("/admin/users-management/me/password", data);
  return response.data;
}

