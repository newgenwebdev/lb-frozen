import { create } from "zustand";
import type { AuthState, User } from "@/lib/types/auth";
import { isTokenValid } from "@/lib/utils/jwt";

// Helper functions for cookie management
function setCookie(name: string, value: string, days = 7): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  // Security: Add Secure flag in production to ensure cookie only sent over HTTPS
  const isProduction = typeof window !== "undefined" && window.location.protocol === "https:";
  const secureFlag = isProduction ? ";Secure" : "";
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict${secureFlag}`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (user: User, token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setCookie("auth_token", token);
    }
    set({ user, token, isAuthenticated: true });
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      deleteCookie("auth_token");
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  initAuth: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");

      if (token && userStr) {
        // Validate JWT token expiration
        if (!isTokenValid(token)) {
          console.log("Token expired, clearing auth state");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          deleteCookie("auth_token");
          set({ user: null, token: null, isAuthenticated: false });
          return;
        }

        try {
          const user = JSON.parse(userStr) as User;
          set({ user, token, isAuthenticated: true });
          setCookie("auth_token", token);
        } catch (error) {
          console.error("Failed to parse user from localStorage:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          deleteCookie("auth_token");
          set({ user: null, token: null, isAuthenticated: false });
        }
      }
    }
  },
}));
