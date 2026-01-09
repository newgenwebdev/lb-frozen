import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Banner } from "@/lib/types/banner";
import { BannerStatusBadge } from "./BannerStatusBadge";
import { ToggleSwitch } from "../membership/ToggleSwitch";
import { DeleteConfirmationModal } from "@/components/ui";
import { useDeleteBanner, useToggleBannerStatus } from "@/lib/api/queries";
import { useToast } from "@/contexts/ToastContext";

export type BannerSortField = "displayId" | "text" | "period" | "status";
export type SortDirection = "asc" | "desc";

type BannerTableProps = {
  banners: Banner[];
  isLoading?: boolean;
  sortField?: BannerSortField | null;
  sortDirection?: SortDirection;
  onSort?: (field: BannerSortField, direction: SortDirection) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

export function BannerTable({
  banners,
  isLoading = false,
  sortField = null,
  sortDirection = "asc",
  onSort,
  onEdit,
  onDelete,
}: BannerTableProps): React.JSX.Element {
  const deleteBannerMutation = useDeleteBanner();

  const handleSort = (field: BannerSortField): void => {
    if (!onSort) return;
    if (sortField === field) {
      const newDirection = sortDirection === "asc" ? "desc" : "asc";
      onSort(field, newDirection);
    } else {
      onSort(field, "asc");
    }
  };

  const getSortIcon = (field: BannerSortField): React.JSX.Element => {
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
  const toggleStatusMutation = useToggleBannerStatus();
  const { showToast } = useToast();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; bannerId: string | null; bannerText: string }>({
    isOpen: false,
    bannerId: null,
    bannerText: "",
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Single selected banner ID for local state (null = none selected)
  // This represents which toggle is ON locally, independent of server state
  const [localSelectedId, setLocalSelectedId] = useState<string | null | undefined>(undefined);

  // Single global debounce timer for syncing with server
  const syncTimer = useRef<NodeJS.Timeout | null>(null);

  // Track if we're syncing to prevent double syncs
  const isSyncing = useRef(false);

  // Get the server's currently enabled banner ID
  const getServerSelectedId = useCallback((): string | null => {
    const enabledBanner = banners.find((b) => b.isEnabled);
    return enabledBanner?.id ?? null;
  }, [banners]);

  // Initialize local state from server state when banners change
  useEffect(() => {
    // Only initialize if we don't have local state yet (undefined)
    // or if we're not in the middle of user interaction
    if (localSelectedId === undefined) {
      setLocalSelectedId(getServerSelectedId());
    }
  }, [banners, localSelectedId, getServerSelectedId]);

  // Sync local state with server after mutation success
  useEffect(() => {
    if (!toggleStatusMutation.isPending && !isSyncing.current) {
      // When mutation completes, reset local state to match server
      setLocalSelectedId(getServerSelectedId());
    }
  }, [toggleStatusMutation.isPending, getServerSelectedId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
      }
    };
  }, []);

  // Get whether a banner's toggle should be ON (for display)
  const isBannerToggleOn = (bannerId: string): boolean => {
    // Use local state if set, otherwise fall back to server state
    if (localSelectedId !== undefined) {
      return localSelectedId === bannerId;
    }
    return banners.find((b) => b.id === bannerId)?.isEnabled ?? false;
  };

  // Handle toggle click - works like radio buttons with ability to turn off
  const handleToggleClick = (bannerId: string): void => {
    // Clear any pending sync
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
      syncTimer.current = null;
    }

    // Toggle logic: if clicking the already selected one, turn it off (null)
    // Otherwise, select the clicked one (and implicitly turn off others)
    const newSelectedId = localSelectedId === bannerId ? null : bannerId;

    // Update local state immediately (instant UI feedback)
    setLocalSelectedId(newSelectedId);

    // Set debounced sync timer (500ms)
    syncTimer.current = setTimeout(() => {
      syncWithServer(newSelectedId);
    }, 500);
  };

  // Sync the final state with the server
  const syncWithServer = (selectedId: string | null): void => {
    const serverSelectedId = getServerSelectedId();

    // Only sync if state actually differs from server
    if (selectedId === serverSelectedId) {
      // No change needed, just ensure local state matches
      return;
    }

    isSyncing.current = true;

    if (selectedId === null) {
      // Turn off the currently enabled banner on server
      if (serverSelectedId) {
        toggleStatusMutation.mutate(
          { id: serverSelectedId, isEnabled: false },
          {
            onSettled: () => {
              isSyncing.current = false;
            },
            onError: (error) => {
              console.error("Failed to disable banner:", error);
              // Revert local state to server state on error
              setLocalSelectedId(getServerSelectedId());
            },
          }
        );
      } else {
        isSyncing.current = false;
      }
    } else {
      // Enable the selected banner (server will disable others)
      toggleStatusMutation.mutate(
        { id: selectedId, isEnabled: true },
        {
          onSettled: () => {
            isSyncing.current = false;
          },
          onError: (error) => {
            console.error("Failed to enable banner:", error);
            // Revert local state to server state on error
            setLocalSelectedId(getServerSelectedId());
          },
        }
      );
    }
  };

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
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
          <p className="mt-4 font-public text-[14px] text-[#6A7282]">Loading banners...</p>
        </div>
      </div>
    );
  }

  if (!banners || banners.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        <div className="p-12 text-center">
          <div className="mb-4 text-[48px]">🎨</div>
          <h3 className="mb-2 font-geist text-[18px] font-medium text-[#030712]">No banners found</h3>
          <p className="font-public text-[14px] text-[#6A7282]">Get started by adding your first banner</p>
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
                  <div
                    className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                    onClick={() => handleSort("displayId")}
                  >
                    <span>ID</span>
                    {getSortIcon("displayId")}
                  </div>
                </th>
                <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div
                    className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                    onClick={() => handleSort("text")}
                  >
                    <span>Text</span>
                    {getSortIcon("text")}
                  </div>
                </th>
                <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div
                    className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                    onClick={() => handleSort("period")}
                  >
                    <span>Period</span>
                    {getSortIcon("period")}
                  </div>
                </th>
                <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div
                    className="flex cursor-pointer items-center gap-2 transition-colors hover:text-[#030712]"
                    onClick={() => handleSort("status")}
                  >
                    <span>Status</span>
                    {getSortIcon("status")}
                  </div>
                </th>
                <th className="px-3 py-3 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <div className="flex items-center gap-2">
                    <span>Show</span>
                  </div>
                </th>
                <th className="py-3 pl-3 pr-6 text-left font-geist text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">
                  <span>Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {banners.map((banner) => {
                const isToggleOn = isBannerToggleOn(banner.id);
                return (
                  <tr key={banner.id} className="border-b border-[#E5E7EB] transition-colors hover:bg-[#F9FAFB]">
                    <td className="py-4 pl-6 pr-3">
                      <span className="font-public text-[14px] font-medium text-[#030712]">
                        #{banner.displayId}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span className="font-public text-[14px] font-medium text-[#030712]">
                        {banner.text}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span className="font-public text-[14px] font-medium text-[#030712]">
                        {banner.period}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <BannerStatusBadge status={banner.status} />
                    </td>
                    <td className="px-3 py-4">
                      <ToggleSwitch
                        checked={isToggleOn}
                        onChange={() => handleToggleClick(banner.id)}
                      />
                    </td>
                    <td className="py-4 pl-3 pr-6">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            if (openMenuId === banner.id) {
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
                              setOpenMenuId(banner.id);
                            }
                          }}
                          className="cursor-pointer text-[#030712] transition-colors hover:text-[#6A7282]"
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Menu Portal */}
      {openMenuId && menuPosition && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed z-9999 w-40 rounded-lg border border-[#E5E7EB] bg-white shadow-lg"
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
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left font-public text-[14px] text-[#030712] transition-colors hover:bg-[#F9FAFB]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M11.3333 2.00033C11.5084 1.82522 11.7163 1.68626 11.9447 1.59148C12.1731 1.4967 12.4178 1.44794 12.665 1.44794C12.9122 1.44794 13.1569 1.4967 13.3853 1.59148C13.6137 1.68626 13.8216 1.82522 13.9967 2.00033C14.1718 2.17544 14.3108 2.38331 14.4056 2.61171C14.5004 2.84011 14.5491 3.08481 14.5491 3.332C14.5491 3.57919 14.5004 3.82389 14.4056 4.05229C14.3108 4.28069 14.1718 4.48856 13.9967 4.66367L5.17333 13.487L1.33333 14.6637L2.51 10.8237L11.3333 2.00033Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Edit Details
            </button>
            <div className="my-1 border-t border-[#E5E7EB]"></div>
            <button
              onClick={() => {
                const banner = banners.find((b) => b.id === openMenuId);
                setDeleteModal({
                  isOpen: true,
                  bannerId: openMenuId,
                  bannerText: banner?.text || "this banner",
                });
                setOpenMenuId(null);
                setMenuPosition(null);
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left font-public text-[14px] text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" fill="#DC2626" />
                <path d="M8 5V11M5 8H11" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete Banner
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => {
          if (!deleteBannerMutation.isPending) {
            setDeleteModal({ isOpen: false, bannerId: null, bannerText: "" });
          }
        }}
        onConfirm={() => {
          if (deleteModal.bannerId) {
            deleteBannerMutation.mutate(deleteModal.bannerId, {
              onSuccess: () => {
                setDeleteModal({ isOpen: false, bannerId: null, bannerText: "" });
                onDelete?.(deleteModal.bannerId!);
              },
              onError: (error) => {
                console.error("Failed to delete banner:", error);
                showToast("Failed to delete banner. Please try again.", "error");
              },
            });
          }
        }}
        title="Delete Banner"
        itemName={deleteModal.bannerText ? `this Banner (${deleteModal.bannerText})` : "this Banner"}
        isLoading={deleteBannerMutation.isPending}
      />
    </>
  );
}
