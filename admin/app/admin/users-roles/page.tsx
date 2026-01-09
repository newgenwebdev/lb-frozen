"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { UserTable } from "@/components/admin/user/UserTable";
import { BannerPagination } from "@/components/admin/banner";
import { useUsers, useCurrentUser } from "@/lib/api/queries";
import { mapUserListAPIToUI } from "@/lib/utils/user-mapper";

export default function UserRolesPage(): React.JSX.Element {
  const router = useRouter();
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [roleFilter, setRoleFilter] = useState<"admin" | "owner" | "all">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<
    "Active" | "Non Active" | "all"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Check if current user is an owner (can access this page)
  const isOwner = currentUser?.role?.toLowerCase() === "owner";

  // Calculate offset for API
  const offset = (currentPage - 1) * itemsPerPage;

  // Fetch users from API
  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
  } = useUsers({
    limit: itemsPerPage,
    offset,
    role: roleFilter,
    status: statusFilter,
    q: searchQuery || undefined,
  });

  // Map API response to UI format
  const userData = useMemo(() => {
    if (!apiResponse) {
      return {
        users: [],
        count: 0,
        page: 1,
        limit: itemsPerPage,
      };
    }
    return mapUserListAPIToUI(apiResponse);
  }, [apiResponse, itemsPerPage]);

  const { users, count, limit } = userData;
  const totalPages = Math.ceil(count / limit);

  // Redirect non-owners to overview
  useEffect(() => {
    if (!isLoadingUser && currentUser && !isOwner) {
      router.replace("/admin/overview");
    }
  }, [isLoadingUser, currentUser, isOwner, router]);

  // Handle page change
  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number): void => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Handle add new user click
  const handleAddClick = (): void => {
    router.push("/admin/users-roles/add");
  };

  // Handle edit user
  const handleEdit = (id: string): void => {
    router.push(`/admin/users-roles/edit/${id}`);
  };

  // Handle delete user
  const handleDelete = (id: string): void => {
    // Delete is handled by the UserTable component with the modal
    // This function is kept for compatibility but the actual deletion
    // happens in the table component via the mutation
  };

  // Show loading while checking permissions
  if (isLoadingUser || (!isOwner && currentUser)) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-black" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="px-4 md:px-8">
        <div className="mb-6">
          <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712] mb-6">
            Users List
          </h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-[16px] font-medium text-[#030712]">
              Failed to load users
            </h3>
            <p className="mt-2 text-[14px] text-[#6A7282]">
              {error?.message || "An error occurred while fetching users."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Users List
        </h1>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Button
            variant="primary"
            onClick={handleAddClick}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M8 3.33333V12.6667"
                  stroke="white"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.33398 8H12.6673"
                  stroke="white"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            Add new user
          </Button>
        </div>
      </div>

      {/* Table */}
      <UserTable
        users={users}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {totalPages > 0 && (
        <BannerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  );
}
