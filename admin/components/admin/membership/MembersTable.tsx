"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Member } from "@/lib/types/membership";
import { useDeleteMember } from "@/lib/api/mutations";

type MembersTableProps = {
  members: Member[];
  isLoading?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
  openUp: boolean;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPoints(points: number): string {
  return points.toLocaleString();
}

function getMemberName(member: Member): string {
  if (!member.customer) return "Unknown";
  const firstName = member.customer.first_name || "";
  const lastName = member.customer.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || member.customer.email;
}

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const isActive = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-public text-[12px] font-medium ${
        isActive ? "bg-[#DEF7EC] text-[#03543F]" : "bg-[#FEE2E2] text-[#991B1B]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-[#10B981]" : "bg-[#EF4444]"
        }`}
      />
      {isActive ? "Active" : "Cancelled"}
    </span>
  );
}

function TierBadge({ tier }: { tier: string | undefined }): React.JSX.Element {
  // Define tier colors based on tier slug
  const getTierStyles = (tierSlug: string): { bg: string; text: string } => {
    switch (tierSlug?.toLowerCase()) {
      case "platinum":
        return { bg: "bg-[#1F2937]", text: "text-white" };
      case "gold":
        return { bg: "bg-[#FEF3C7]", text: "text-[#92400E]" };
      case "silver":
        return { bg: "bg-[#E5E7EB]", text: "text-[#374151]" };
      case "classic":
      default:
        return { bg: "bg-[#F3E8FF]", text: "text-[#6B21A8]" };
    }
  };

  const tierSlug = tier || "classic";
  const styles = getTierStyles(tierSlug);
  const displayName = tierSlug.charAt(0).toUpperCase() + tierSlug.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-public text-[12px] font-medium ${styles.bg} ${styles.text}`}
    >
      {displayName}
    </span>
  );
}

export function MembersTable({
  members,
  isLoading = false,
}: MembersTableProps): React.JSX.Element {
  const router = useRouter();
  const deleteMemberMutation = useDeleteMember();

  // Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>("");

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    }

    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [openMenuId]);

  // Close menu on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpenMenuId(null);
        setMenuPosition(null);
        setDeleteConfirmId(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleRowClick = (customerId: string): void => {
    router.push(`/admin/membership/members/${customerId}`);
  };

  const handleMenuClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    memberId: string
  ): void => {
    e.stopPropagation();

    if (openMenuId === memberId) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }

    const buttonRect = e.currentTarget.getBoundingClientRect();
    const openUp = buttonRect.bottom > window.innerHeight - 200;

    setMenuPosition({
      top: openUp ? buttonRect.top : buttonRect.bottom + 4,
      left: buttonRect.right - 140,
      openUp,
    });
    setOpenMenuId(memberId);
  };

  const handleViewDetails = (customerId: string): void => {
    setOpenMenuId(null);
    setMenuPosition(null);
    router.push(`/admin/membership/members/${customerId}`);
  };

  const handleDeleteClick = (member: Member): void => {
    setOpenMenuId(null);
    setMenuPosition(null);
    if (member.customer) {
      setDeleteConfirmId(member.customer.id);
      setDeleteConfirmName(getMemberName(member));
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteConfirmId) return;

    try {
      await deleteMemberMutation.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
      setDeleteConfirmName("");
    } catch (error) {
      console.error("Failed to delete member:", error);
    }
  };

  const handleCancelDelete = (): void => {
    setDeleteConfirmId(null);
    setDeleteConfirmName("");
  };

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
          <p className="mt-4 font-public text-[14px] text-[#6A7282]">
            Loading members...
          </p>
        </div>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        <div className="p-12 text-center">
          <div className="mb-4 text-[48px]">👥</div>
          <h3 className="mb-2 font-geist text-[18px] font-medium text-[#030712]">
            No members found
          </h3>
          <p className="font-public text-[14px] text-[#6A7282]">
            Members will appear here once customers purchase memberships
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="py-3 pl-6 pr-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  Member
                </th>
                <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  Email
                </th>
                <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  Tier
                </th>
                <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  Status
                </th>
                <th className="px-3 py-3 text-right font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  Points Balance
                </th>
                <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  Member Since
                </th>
                <th className="py-3 pl-3 pr-6 text-center font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.membership_id}
                  onClick={() =>
                    member.customer && handleRowClick(member.customer.id)
                  }
                  className="cursor-pointer border-b border-[#E5E7EB] transition-colors hover:bg-[#F9FAFB]"
                >
                  <td className="py-4 pl-6 pr-3">
                    <span className="font-public text-[14px] font-medium text-[#030712]">
                      {getMemberName(member)}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <span className="font-public text-[14px] text-[#6A7282]">
                      {member.customer?.email || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <TierBadge tier={member.tier_slug} />
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className="font-public text-[14px] font-medium text-[#030712]">
                      {member.points ? formatPoints(member.points.balance) : "0"}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <span className="font-public text-[14px] text-[#6A7282]">
                      {formatDate(member.activated_at)}
                    </span>
                  </td>
                  <td className="py-4 pl-3 pr-6 text-center">
                    <button
                      onClick={(e) => handleMenuClick(e, member.membership_id)}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#6A7282] transition-colors hover:bg-[#F3F4F6] hover:text-[#030712]"
                      aria-label="Actions"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M8 3C8.55228 3 9 2.55228 9 2C9 1.44772 8.55228 1 8 1C7.44772 1 7 1.44772 7 2C7 2.55228 7.44772 3 8 3Z"
                          fill="currentColor"
                        />
                        <path
                          d="M8 9C8.55228 9 9 8.55228 9 8C9 7.44772 8.55228 7 8 7C7.44772 7 7 7.44772 7 8C7 8.55228 7.44772 9 8 9Z"
                          fill="currentColor"
                        />
                        <path
                          d="M8 15C8.55228 15 9 14.5523 9 14C9 13.4477 8.55228 13 8 13C7.44772 13 7 13.4477 7 14C7 14.5523 7.44772 15 8 15Z"
                          fill="currentColor"
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
      {openMenuId &&
        menuPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-[160px] rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg"
            style={{
              top: menuPosition.openUp ? "auto" : menuPosition.top,
              bottom: menuPosition.openUp
                ? `${window.innerHeight - menuPosition.top + 4}px`
                : "auto",
              left: menuPosition.left,
            }}
          >
            <button
              onClick={() => {
                const member = members.find(
                  (m) => m.membership_id === openMenuId
                );
                if (member?.customer) {
                  handleViewDetails(member.customer.id);
                }
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-public text-[14px] text-[#030712] transition-colors hover:bg-[#F9FAFB]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 3C4.5 3 1.5 6.5 1 8C1.5 9.5 4.5 13 8 13C11.5 13 14.5 9.5 15 8C14.5 6.5 11.5 3 8 3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="8"
                  cy="8"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              View Details
            </button>
            <div className="my-1 border-t border-[#E5E7EB]" />
            <button
              onClick={() => {
                const member = members.find(
                  (m) => m.membership_id === openMenuId
                );
                if (member) {
                  handleDeleteClick(member);
                }
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left font-public text-[14px] text-[#EF4444] transition-colors hover:bg-[#FEF2F2]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 4H14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13 4V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Delete
            </button>
          </div>,
          document.body
        )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-2 font-geist text-[18px] font-semibold text-[#030712]">
                Delete Membership
              </h3>
              <p className="mb-6 font-public text-[14px] text-[#6A7282]">
                Are you sure you want to delete the membership for{" "}
                <span className="font-medium text-[#030712]">
                  {deleteConfirmName}
                </span>
                ? This will remove the membership, points balance, and all
                associated data. The customer account will remain.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelDelete}
                  disabled={deleteMemberMutation.isPending}
                  className="cursor-pointer rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-public text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteMemberMutation.isPending}
                  className="cursor-pointer rounded-lg bg-[#EF4444] px-4 py-2 font-public text-[14px] font-medium text-white transition-colors hover:bg-[#DC2626] disabled:opacity-50"
                >
                  {deleteMemberMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
              {deleteMemberMutation.isError && (
                <p className="mt-4 font-public text-[14px] text-[#EF4444]">
                  Failed to delete membership. Please try again.
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
