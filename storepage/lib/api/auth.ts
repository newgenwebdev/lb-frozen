/**
 * Authentication API Service
 * Handles customer authentication and account management
 */

import { apiClient } from './client';
import type { Customer, CustomerRegistration, CustomerLogin } from './types';

const AUTH_TOKEN_KEY =
  process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY || 'lb-frozen-auth-token';

/**
 * Get stored auth token
 */
export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Store auth token
 */
export function setStoredAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/**
 * Clear auth token
 */
export function clearStoredAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Register new customer
 * NOTE: Public registration is disabled. Customers must be created by admin.
 */
export async function register(
  _data: CustomerRegistration
): Promise<{ customer: Customer }> {
  throw new Error('Public registration is disabled. Please contact support.');
}

/**
 * Login customer using Medusa v2 auth flow
 */
export async function login(
  credentials: CustomerLogin
): Promise<{ customer: Customer; token?: string }> {
  // Step 1: Authenticate with emailpass provider
  const authResponse = await apiClient.post<{ token: string }>(
    '/auth/customer/emailpass',
    {
      email: credentials.email,
      password: credentials.password,
    }
  );

  // Store the JWT token
  if (authResponse.token) {
    setStoredAuthToken(authResponse.token);
  }

  // Step 2: Get the customer data (including metadata for profile image, etc.)
  // Use our custom endpoint that includes metadata
  const customerResponse = await apiClient.get<{ customer: Customer }>(
    '/store/customer/me'
  );

  return {
    customer: customerResponse.customer,
    token: authResponse.token,
  };
}

/**
 * Logout customer
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.delete('/auth/session');
  } catch {
    // Ignore errors during logout
  } finally {
    clearStoredAuthToken();
  }
}

/**
 * Get current customer
 */
export async function getCurrentCustomer(): Promise<Customer | null> {
  try {
    // Use our custom endpoint that includes metadata and addresses
    const response = await apiClient.get<{ customer: Customer }>(
      '/store/customer/me?fields=*shipping_addresses'
    );
    console.log('[AUTH] getCurrentCustomer response:', response.customer);
    console.log('[AUTH] shipping_addresses:', response.customer?.shipping_addresses);
    return response.customer;
  } catch (error) {
    console.error('Failed to fetch current customer:', error);
    return null;
  }
}

/**
 * Update customer information
 */
export async function updateCustomer(data: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}): Promise<Customer> {
  const response = await apiClient.post<{ customer: Customer }>(
    '/store/customers/me',
    data
  );

  return response.customer;
}

/**
 * Update customer password
 */
export async function updatePassword(data: {
  old_password: string;
  new_password: string;
}): Promise<{ customer: Customer }> {
  return apiClient.post('/store/customers/me/password', data);
}

/**
 * Request password reset
 */
export async function requestPasswordReset(
  email: string
): Promise<{ message: string }> {
  return apiClient.post('/store/customer/reset-password', { email });
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  password: string
): Promise<{ message: string }> {
  return apiClient.post('/store/customer/reset-password', {
    token,
    password,
  });
}

/**
 * Resend email verification
 */
export async function resendVerification(
  email: string
): Promise<{ message: string }> {
  return apiClient.post('/store/auth/resend-verification', { email });
}

/**
 * Get customer addresses
 */
export async function getAddresses(): Promise<any[]> {
  const response = await apiClient.get<{ customer: any }>(
    '/store/customers/me'
  );
  // Medusa v2 uses 'addresses' field
  return response.customer.addresses || response.customer.shipping_addresses || [];
}

/**
 * Add customer address
 */
export async function addAddress(address: any): Promise<Customer> {
  const response = await apiClient.post<{ customer: Customer }>(
    '/store/customers/me/addresses',
    address
  );
  return response.customer;
}

/**
 * Update customer address
 */
export async function updateAddress(
  addressId: string,
  address: any
): Promise<Customer> {
  const response = await apiClient.post<{ customer: Customer }>(
    `/store/customers/me/addresses/${addressId}`,
    address
  );
  return response.customer;
}

/**
 * Delete customer address
 */
export async function deleteAddress(addressId: string): Promise<Customer> {
  const response = await apiClient.delete<{ customer: Customer }>(
    `/store/customers/me/addresses/${addressId}`
  );
  return response.customer;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getStoredAuthToken();
}

/**
 * Get customer's pricing role
 * Returns role info for displaying appropriate prices
 */
export async function getCustomerRole(): Promise<{
  authenticated: boolean;
  customer_id?: string;
  role: string;
  role_info: {
    slug: string;
    name: string;
    description: string;
    can_see_bulk_prices: boolean;
    can_see_vip_prices: boolean;
  };
}> {
  try {
    const response = await apiClient.get<{
      authenticated: boolean;
      customer_id?: string;
      role: string;
      role_info: {
        slug: string;
        name: string;
        description: string;
        can_see_bulk_prices: boolean;
        can_see_vip_prices: boolean;
      };
    }>('/store/customer/role');
    return response;
  } catch (error) {
    // Return default retail role on error
    return {
      authenticated: false,
      role: 'retail',
      role_info: {
        slug: 'retail',
        name: 'Retail',
        description: 'Standard retail pricing',
        can_see_bulk_prices: false,
        can_see_vip_prices: false,
      },
    };
  }
}

/**
 * Convert File to binary string
 */
async function fileToContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Get the result as ArrayBuffer and convert to binary string
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      resolve(binary);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Upload profile image using /store/uploads endpoint
 * Same pattern as admin product uploads
 */
export async function uploadProfileImage(file: File): Promise<string> {
  // Convert file to binary content
  const content = await fileToContent(file);
  
  // Use the store uploads endpoint (mirrors admin uploads)
  const response = await apiClient.post<{ files: { url: string }[] }>('/store/uploads', {
    files: [{
      name: file.name,
      content: content,
    }],
  });

  if (!response.files || response.files.length === 0) {
    throw new Error('Upload failed: No URL returned');
  }

  const imageUrl = response.files[0].url;

  // Save to customer metadata
  await updateCustomer({
    metadata: {
      profile_image: imageUrl,
    },
  });

  return imageUrl;
}

/**
 * Delete profile image
 */
export async function deleteProfileImage(): Promise<void> {
  await updateCustomer({
    metadata: {
      profile_image: null,
    },
  });
}
