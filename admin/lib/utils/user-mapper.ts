/**
 * User Mapper Utilities
 *
 * Functions to map API responses to UI format
 */

import type { UserAPI, User, UserRole, UserStatus } from "../types/user";

/**
 * Extract display ID from user ID (last 4 characters or a short version)
 */
function extractDisplayId(id: string): string {
  // Use last 4 characters of the ID as display ID
  // If ID is shorter, use the whole ID
  if (id.length <= 4) {
    return id.toUpperCase();
  }
  return id.slice(-4).toUpperCase();
}

/**
 * Map API role to UI role
 */
function mapRole(apiRole: "admin" | "owner"): UserRole {
  return apiRole === "admin" ? "Admin" : "Owner";
}

/**
 * Map API status to UI status
 */
function mapStatus(apiStatus: "Active" | "Non Active"): UserStatus {
  return apiStatus === "Active" ? "active" : "non-active";
}

/**
 * Map API user to UI user format
 */
export function mapUserAPIToUI(apiUser: UserAPI): User {
  return {
    id: apiUser.id,
    displayId: extractDisplayId(apiUser.id),
    name: apiUser.name,
    email: apiUser.email,
    role: mapRole(apiUser.role),
    status: mapStatus(apiUser.status),
  };
}

/**
 * Map API user list response to UI format
 */
export function mapUserListAPIToUI(apiResponse: {
  users: UserAPI[];
  count: number;
  limit: number;
  offset: number;
}): {
  users: User[];
  count: number;
  page: number;
  limit: number;
} {
  return {
    users: apiResponse.users.map(mapUserAPIToUI),
    count: apiResponse.count,
    page: apiResponse.limit > 0 ? Math.floor(apiResponse.offset / apiResponse.limit) + 1 : 1,
    limit: apiResponse.limit,
  };
}

