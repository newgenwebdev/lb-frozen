import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { User } from "@/lib/types/user";
import { BannerStatusBadge } from "../banner/BannerStatusBadge";
import { DeleteConfirmationModal } from "@/components/ui";
import { useDeleteUser } from "@/lib/api/queries";
import { useToast } from "@/contexts/ToastContext";

export type UserSortField = "displayId" | "name" | "email" | "role" | "status";
export type SortDirection = "asc" | "desc";

type UserTableProps = {
  users: User[];
  isLoading?: boolean;
  sortField?: UserSortField | null;
  sortDirection?: SortDirection;
  onSort?: (field: UserSortField, direction: SortDirection) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function UserTable({
  users,
  isLoading = false,
  sortField = null,
  sortDirection = "asc",
  onSort,
  onEdit,
  onDelete,
}: UserTableProps): React.JSX.Element {
  const deleteUserMutation = useDeleteUser();

  const handleSort = (field: UserSortField): void => {
    if (!onSort) return;
    if (sortField === field) {
      const newDirection = sortDirection === "asc" ? "desc" : "asc";
      onSort(field, newDirection);
    } else {
      onSort(field, "asc");
    }
  };

  const getSortIcon = (field: UserSortField): React.JSX.Element => {
    const isActive = sortField === field;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className={`transition-transform ${isActive ? "text-[#030712]" : ""} ${isActive && sortDirection === "desc" ? "rotate-180" : ""}`}
      >
        <path
          d="M4 6L8 10L12 6"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };
  const { showToast } = useToast();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; userId: string | null; userName: string }>({
    isOpen: false,
    userId: null,
    userName: "",
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
          <p className="mt-4 font-public text-[14px] text-[#6A7282]">Loading users...</p>
        </div>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="p-12 text-center">
          <div className="mb-4 text-[48px]">👥</div>
          <h3 className="mb-2 font-geist text-[18px] font-medium text-[#030712]">No users found</h3>
          <p className="font-public text-[14px] text-[#6A7282]">Get started by adding your first user</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="text-left py-3 pl-6 pr-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors"
                    onClick={() => handleSort("displayId")}
                  >
                    <span>ID</span>
                    {getSortIcon("displayId")}
                  </div>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <span>Name</span>
                    {getSortIcon("name")}
                  </div>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors"
                    onClick={() => handleSort("email")}
                  >
                    <span>Email</span>
                    {getSortIcon("email")}
                  </div>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors"
                    onClick={() => handleSort("role")}
                  >
                    <span>Role</span>
                    {getSortIcon("role")}
                  </div>
                </th>
                <th className="text-left py-3 px-3 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div
                    className="flex items-center gap-2 cursor-pointer hover:text-[#030712] transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <span>Status</span>
                    {getSortIcon("status")}
                  </div>
                </th>
                <th className="text-left py-3 pl-3 pr-6 font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <span>Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-4 pl-6 pr-3">
                    <span className="font-public text-[14px] font-medium text-[#030712]">
                      #{user.displayId}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="font-public text-[14px] font-medium text-[#030712]">
                      {user.name}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="font-public text-[14px] font-medium text-[#030712]">
                      {user.email}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    <span className="font-public text-[14px] font-medium text-[#030712]">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-3">
                    <BannerStatusBadge status={user.status} />
                  </td>
                  <td className="py-4 pl-3 pr-6">
                    <button
                      onClick={(e) => {
                        if (openMenuId === user.id) {
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        } else {
                          const buttonRect = e.currentTarget.getBoundingClientRect();
                          const viewportHeight = window.innerHeight;
                          const openUp = buttonRect.bottom > viewportHeight - 200;
                          setMenuPosition({
                            top: openUp ? buttonRect.top : buttonRect.bottom + 4,
                            left: buttonRect.right - 160,
                            openUp,
                          });
                          setOpenMenuId(user.id);
                        }
                      }}
                      className="text-[#030712] hover:text-[#6A7282] cursor-pointer transition-colors"
                      aria-label="More options"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M12.3388 8.00339C12.3388 8.18757 12.1895 8.33687 12.0053 8.33687C11.8212 8.33687 11.6719 8.18757 11.6719 8.00339C11.6719 7.81922 11.8212 7.66992 12.0053 7.66992C12.1895 7.66992 12.3388 7.81922 12.3388 8.00339"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8.33687 8.00339C8.33687 8.18757 8.18757 8.33687 8.00339 8.33687C7.81922 8.33687 7.66992 8.18757 7.66992 8.00339C7.66992 7.81922 7.81922 7.66992 8.00339 7.66992C8.18757 7.66992 8.33687 7.81922 8.33687 8.00339"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M4.33491 8.00339C4.33491 8.18757 4.18561 8.33687 4.00144 8.33687C3.81727 8.33687 3.66797 8.18757 3.66797 8.00339C3.66797 7.81922 3.81727 7.66992 4.00144 7.66992C4.18561 7.66992 4.33491 7.81922 4.33491 8.00339"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Menu Portal */}
      {openMenuId && menuPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed w-40 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-[9999]"
          style={{
            top: menuPosition.openUp ? "auto" : menuPosition.top,
            bottom: menuPosition.openUp ? `${window.innerHeight - menuPosition.top + 4}px` : "auto",
            left: menuPosition.left,
          }}
        >
          <div className="py-1">
            <button
              onClick={() => {
                onEdit?.(openMenuId);
                setOpenMenuId(null);
                setMenuPosition(null);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-left font-public text-[14px] text-[#030712] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M11.3333 2.00033C11.5084 1.82522 11.7163 1.68626 11.9447 1.59148C12.1731 1.4967 12.4178 1.44794 12.665 1.44794C12.9122 1.44794 13.1569 1.4967 13.3853 1.59148C13.6137 1.68626 13.8216 1.82522 13.9967 2.00033C14.1718 2.17544 14.3108 2.38331 14.4056 2.61171C14.5004 2.84011 14.5491 3.08481 14.5491 3.332C14.5491 3.57919 14.5004 3.82389 14.4056 4.05229C14.3108 4.28069 14.1718 4.48856 13.9967 4.66367L5.17333 13.487L1.33333 14.6637L2.51 10.8237L11.3333 2.00033Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Edit Details
            </button>
            <div className="border-t border-[#E5E7EB] my-1"></div>
            <button
              onClick={() => {
                const user = users.find((u) => u.id === openMenuId);
                setDeleteModal({
                  isOpen: true,
                  userId: openMenuId,
                  userName: user?.name || "this user",
                });
                setOpenMenuId(null);
                setMenuPosition(null);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-left font-public text-[14px] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" fill="#DC2626" />
                <path d="M8 5V11M5 8H11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete User
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          if (!deleteUserMutation.isPending) {
            setDeleteModal({ isOpen: false, userId: null, userName: "" });
          }
        }}
        onConfirm={() => {
          if (deleteModal.userId) {
            deleteUserMutation.mutate(deleteModal.userId, {
              onSuccess: () => {
                setDeleteModal({ isOpen: false, userId: null, userName: "" });
                onDelete?.(deleteModal.userId!);
              },
              onError: (error) => {
                console.error("Failed to delete user:", error);
                showToast("Failed to delete user. Please try again.", "error");
              },
            });
          }
        }}
        title="Delete User"
        itemName={deleteModal.userName ? `this User (${deleteModal.userName})` : "this User"}
        isLoading={deleteUserMutation.isPending}
      />
    </>
  );
}

