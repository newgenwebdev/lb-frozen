import { jwtDecode } from "jwt-decode";

interface JWTPayload {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * Validates if a JWT token is expired
 * @param token - The JWT token string
 * @returns true if token is valid and not expired, false otherwise
 */
export function isTokenValid(token: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);

    // Check if token has expiration claim
    if (!decoded.exp) {
      // If no expiration, consider it invalid for security
      return false;
    }

    // JWT exp is in seconds, Date.now() is in milliseconds
    const currentTime = Date.now() / 1000;
    const isExpired = decoded.exp < currentTime;

    return !isExpired;
  } catch (error) {
    // Invalid token format or decode error
    console.error("Failed to decode JWT token:", error);
    return false;
  }
}

/**
 * Gets the expiration time from a JWT token
 * @param token - The JWT token string
 * @returns Date object of expiration time, or null if invalid
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwtDecode<JWTPayload>(token);

    if (!decoded.exp) {
      return null;
    }

    // Convert seconds to milliseconds
    return new Date(decoded.exp * 1000);
  } catch (error) {
    console.error("Failed to get token expiration:", error);
    return null;
  }
}
