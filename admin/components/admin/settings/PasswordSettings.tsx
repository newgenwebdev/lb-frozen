"use client";

import React, { useState } from "react";
import { useChangePassword } from "@/lib/api/mutations";

export function PasswordSettings(): React.JSX.Element {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const changePasswordMutation = useChangePassword();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!currentPassword.trim()) {
      setError("Current password is required");
      return;
    }

    if (!newPassword.trim()) {
      setError("New password is required");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    try {
      const result = await changePasswordMutation.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (result.success) {
        setSuccess(result.message || "Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to change password. Please try again.";

      // Extract error message from axios error response
      if (typeof err === "object" && err !== null && "response" in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          setError(axiosError.response.data.message);
          return;
        }
      }

      setError(errorMessage);
    }
  };

  const isSubmitting = changePasswordMutation.isPending;

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
      <h2 className="mb-2 font-geist text-[20px] font-medium leading-[120%] tracking-[-0.4px] text-[#030712]">
        Password
      </h2>
      <p className="mb-6 font-public text-[14px] text-[#6A7282]">
        Change your password
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Success Message */}
        {success && (
          <div className="rounded-lg bg-green-50 p-3 text-[14px] text-green-700">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-[14px] text-red-700">
            {error}
          </div>
        )}

        {/* Current Password */}
        <div>
          <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
            Current Password <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[#E5E5E5] px-4 py-2 pr-10 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none transition-colors focus:border-[#030712] disabled:cursor-not-allowed disabled:bg-gray-50"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#6A7282] transition-colors hover:text-[#030712]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                {showCurrentPassword ? (
                  <>
                    <path
                      d="M8 3C5.33333 3 3.33333 4.33333 2 6.66667C3.33333 9 5.33333 10.3333 8 10.3333C10.6667 10.3333 12.6667 9 14 6.66667C12.6667 4.33333 10.6667 3 8 3Z"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 8.66667C8.73638 8.66667 9.33333 8.06971 9.33333 7.33333C9.33333 6.59695 8.73638 6 8 6C7.26362 6 6.66667 6.59695 6.66667 7.33333C6.66667 8.06971 7.26362 8.66667 8 8.66667Z"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : (
                  <>
                    <path
                      d="M8 3C5.33333 3 3.33333 4.33333 2 6.66667C3.33333 9 5.33333 10.3333 8 10.3333C10.6667 10.3333 12.6667 9 14 6.66667C12.6667 4.33333 10.6667 3 8 3Z"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 8.66667C8.73638 8.66667 9.33333 8.06971 9.33333 7.33333C9.33333 6.59695 8.73638 6 8 6C7.26362 6 6.66667 6.59695 6.66667 7.33333C6.66667 8.06971 7.26362 8.66667 8 8.66667Z"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 2L14 14"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
            New Password <span className="text-[#DC2626]">*</span>
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[#E5E5E5] px-4 py-2 pr-10 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none transition-colors focus:border-[#030712] disabled:cursor-not-allowed disabled:bg-gray-50"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#6A7282] transition-colors hover:text-[#030712]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                {showNewPassword ? (
                  <>
                    <path
                      d="M8 3C5.33333 3 3.33333 4.33333 2 6.66667C3.33333 9 5.33333 10.3333 8 10.3333C10.6667 10.3333 12.6667 9 14 6.66667C12.6667 4.33333 10.6667 3 8 3Z"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 8.66667C8.73638 8.66667 9.33333 8.06971 9.33333 7.33333C9.33333 6.59695 8.73638 6 8 6C7.26362 6 6.66667 6.59695 6.66667 7.33333C6.66667 8.06971 7.26362 8.66667 8 8.66667Z"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : (
                  <>
                    <path
                      d="M8 3C5.33333 3 3.33333 4.33333 2 6.66667C3.33333 9 5.33333 10.3333 8 10.3333C10.6667 10.3333 12.6667 9 14 6.66667C12.6667 4.33333 10.6667 3 8 3Z"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 8.66667C8.73638 8.66667 9.33333 8.06971 9.33333 7.33333C9.33333 6.59695 8.73638 6 8 6C7.26362 6 6.66667 6.59695 6.66667 7.33333C6.66667 8.06971 7.26362 8.66667 8 8.66667Z"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 2L14 14"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </svg>
            </button>
          </div>
          <p className="mt-1 font-public text-[12px] text-[#6A7282]">
            Must be at least 8 characters
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg bg-[#030712] px-4 py-2 font-geist text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );
}
