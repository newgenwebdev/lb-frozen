"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { UserFormInput, UserFormDropdown } from "@/components/admin/user";
import { useUpdateUser, useCurrentUser } from "@/lib/api/queries";
import { getUserById } from "@/lib/api/users";
import { useToast } from "@/contexts/ToastContext";
import type { UserFormData, UserRole, UserStatus } from "@/lib/types/user";

export default function EditUserPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const updateUserMutation = useUpdateUser();
  const { showToast } = useToast();

  // Check if current user is an owner (can access this page)
  const isOwner = currentUser?.role?.toLowerCase() === "owner";

  // Redirect non-owners to overview
  useEffect(() => {
    if (!isLoadingUser && currentUser && !isOwner) {
      router.replace("/admin/overview");
    }
  }, [isLoadingUser, currentUser, isOwner, router]);

  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    email: "",
    role: "Admin",
    status: "active",
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const user = await getUserById(userId);
        if (user) {
          setFormData({
            name: user.name || "",
            email: user.email || "",
            role: user.role === "admin" ? "Admin" : "Owner",
            status: user.status === "Active" ? "active" : "non-active",
          });
        } else {
          showToast("User not found", "error");
          router.push("/admin/users-roles");
        }
      } catch (error) {
        console.error("Failed to load user:", error);
        showToast("Failed to load user data. Please try again.", "error");
        router.push("/admin/users-roles");
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      loadUser();
    }
  }, [userId, router]);

  const handleInputChange = (
    field: keyof UserFormData,
    value: string
  ): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      showToast("Please enter a name", "error");
      return;
    }
    if (!formData.email.trim()) {
      showToast("Please enter an email", "error");
      return;
    }

    updateUserMutation.mutate(
      { id: userId, data: formData },
      {
        onSuccess: () => {
          router.push("/admin/users-roles");
        },
        onError: (error) => {
          console.error("Failed to update user:", error);
          showToast("Failed to update user. Please try again.", "error");
        },
      }
    );
  };

  const handleDelete = (): void => {
    // Delete is handled by navigating to list page where the table handles it
    // Or you can implement a delete button here that uses the mutation
    router.push("/admin/users-roles");
  };

  // Show loading while checking permissions or loading user
  if (isLoadingUser || (!isOwner && currentUser) || isLoading) {
    return (
      <div className="px-4 md:px-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
            <p className="mt-4 font-public text-[14px] text-[#6A7282]">
              Loading...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Edit User
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E5E5] bg-white text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
            aria-label="Delete"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M5 6V16C5 17.1046 5.89543 18 7 18H13C14.1046 18 15 17.1046 15 16V6M5 6H3M5 6H7M15 6H17M15 6H13M7 6V4C7 2.89543 7.89543 2 9 2H11C12.1046 2 13 2.89543 13 4V6M7 6H13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            onClick={handleSubmit}
            disabled={updateUserMutation.isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#2F2F2F] px-4 py-2 font-geist text-[14px] font-medium tracking-[-0.14px] text-white transition-colors cursor-pointer hover:bg-[#3D3D3D] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateUserMutation.isPending ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-[#E5E7EB] bg-white p-6"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-4">
            <UserFormInput
              label="Name"
              placeholder="e.g. Ken Taro"
              value={formData.name}
              onChange={(value) => handleInputChange("name", value)}
              icon="grid"
            />
            <UserFormDropdown
              label="Role"
              value={formData.role}
              onChange={(value) => handleInputChange("role", value as UserRole)}
              options={["Admin", "Owner"]}
              icon="grid"
            />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <UserFormInput
              label="Email"
              type="email"
              placeholder="e.g. user@example.com"
              value={formData.email}
              onChange={(value) => handleInputChange("email", value)}
              icon="grid"
            />
            <UserFormDropdown
              label="Status"
              value={formData.status === "active" ? "Active" : "Non Active"}
              onChange={(value) =>
                handleInputChange(
                  "status",
                  value.toLowerCase().replace(" ", "-") as UserStatus
                )
              }
              options={["Active", "Non Active"]}
              icon="gear"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
