/**
 * Customer Roles API
 * Admin functions for managing customer pricing roles
 */

import { api } from "./client";

/**
 * Customer role type
 */
export type CustomerRole = 'retail' | 'bulk' | 'vip' | 'supplier';

/**
 * Customer role info
 */
export interface CustomerRoleInfo {
  key: string;
  slug: CustomerRole;
  group_id: string;
  name: string;
  description: string;
}

/**
 * Customer with role info
 */
export interface CustomerWithRole {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  has_account: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  groups?: Array<{ id: string; name: string }>;
  role?: CustomerRole;
}

/**
 * Create customer request
 */
export interface CreateCustomerRequest {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: CustomerRole;
  password?: string;
  metadata?: Record<string, any>;
}

/**
 * Get all available customer roles
 */
export async function getCustomerRoles(): Promise<{
  roles: CustomerRoleInfo[];
  default_role: CustomerRole;
}> {
  const response = await api.get("/admin/customers/roles");
  return response.data;
}

/**
 * Get a customer's current role
 */
export async function getCustomerRole(customerId: string): Promise<{
  customer_id: string;
  role: CustomerRole;
  role_info: CustomerRoleInfo;
  groups: Array<{ id: string; name: string }>;
}> {
  const response = await api.get(`/admin/customers/${customerId}/role`);
  return response.data;
}

/**
 * Assign a role to a customer
 */
export async function assignCustomerRole(
  customerId: string,
  role: CustomerRole
): Promise<{
  customer_id: string;
  role: CustomerRole;
  message: string;
  groups: Array<{ id: string; name: string }>;
}> {
  const response = await api.put(`/admin/customers/${customerId}/role`, { role });
  return response.data;
}

/**
 * Remove customer from pricing groups (reset to retail)
 */
export async function resetCustomerRole(customerId: string): Promise<{
  customer_id: string;
  role: CustomerRole;
  message: string;
}> {
  const response = await api.delete(`/admin/customers/${customerId}/role`);
  return response.data;
}

/**
 * Create a new customer with role (admin only)
 */
export async function createCustomer(data: CreateCustomerRequest): Promise<{
  customer: CustomerWithRole;
  role: CustomerRole;
  message: string;
}> {
  const response = await api.post("/admin/customers/create", data);
  return response.data;
}

/**
 * Role badge colors
 */
export const ROLE_COLORS: Record<CustomerRole, { bg: string; text: string; border: string }> = {
  retail: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  bulk: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  vip: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
  supplier: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
};

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<CustomerRole, string> = {
  retail: 'Retail',
  bulk: 'Bulk',
  vip: 'VIP',
  supplier: 'Supplier',
};
