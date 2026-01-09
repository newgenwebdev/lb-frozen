"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api/client";

// Notification types
type NotificationType = "order" | "inventory" | "customer" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

// Low stock alert from API
interface LowStockAlert {
  variant_id: string;
  variant_title: string;
  variant_sku: string | null;
  product_id: string;
  product_title: string;
  product_thumbnail: string | null;
  min_stock_alert: number;
  current_stock: number;
  stock_deficit: number;
  checked_at: string;
}

interface LowStockResponse {
  alerts: LowStockAlert[];
  count: number;
  last_checked: string;
  source: "cache" | "realtime";
}

type FilterType = "all" | NotificationType;

function getNotificationIcon(type: NotificationType): React.JSX.Element {
  switch (type) {
    case "order":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6.66699 8.33333V5C6.66699 4.11594 7.01818 3.2681 7.6433 2.64298C8.26842 2.01786 9.11627 1.66667 10.0003 1.66667C10.8844 1.66667 11.7322 2.01786 12.3573 2.64298C12.9825 3.2681 13.3337 4.11594 13.3337 5V8.33333M3.33366 8.33333H16.667L17.5003 18.3333H2.50033L3.33366 8.33333Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "inventory":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M16.6667 5.83333L10 2.5L3.33333 5.83333M16.6667 5.83333L10 9.16667M16.6667 5.83333V14.1667L10 17.5M3.33333 5.83333L10 9.16667M3.33333 5.83333V14.1667L10 17.5M10 9.16667V17.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "customer":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M13.3337 17.5V15.8333C13.3337 14.9493 12.9824 14.1014 12.3573 13.4763C11.7322 12.8512 10.8844 12.5 10.0003 12.5H5.00033C4.11627 12.5 3.26842 12.8512 2.6433 13.4763C2.01818 14.1014 1.66699 14.9493 1.66699 15.8333V17.5M18.3337 17.5V15.8333C18.3331 15.0948 18.087 14.3773 17.6347 13.7936C17.1823 13.2099 16.5487 12.793 15.8337 12.6083M13.3337 2.60833C14.0506 2.79192 14.686 3.20892 15.1397 3.79359C15.5935 4.37827 15.8403 5.09736 15.8403 5.8375C15.8403 6.57764 15.5935 7.29673 15.1397 7.88141C14.686 8.46608 14.0506 8.88308 13.3337 9.06667M10.0003 5.83333C10.0003 7.67428 8.50796 9.16667 6.66699 9.16667C4.82604 9.16667 3.33366 7.67428 3.33366 5.83333C3.33366 3.99238 4.82604 2.5 6.66699 2.5C8.50796 2.5 10.0003 3.99238 10.0003 5.83333Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "system":
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M10 6.66667V10M10 13.3333H10.0083M18.3333 10C18.3333 14.6024 14.6024 18.3333 10 18.3333C5.39763 18.3333 1.66667 14.6024 1.66667 10C1.66667 5.39763 5.39763 1.66667 10 1.66667C14.6024 1.66667 18.3333 5.39763 18.3333 10Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function getNotificationBgColor(type: NotificationType, read: boolean): string {
  if (!read) {
    return "bg-blue-50";
  }
  return "bg-white";
}

function getNotificationIconBgColor(type: NotificationType): string {
  switch (type) {
    case "order":
      return "bg-green-100 text-green-600";
    case "inventory":
      return "bg-amber-100 text-amber-600";
    case "customer":
      return "bg-purple-100 text-purple-600";
    case "system":
      return "bg-gray-100 text-gray-600";
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function NotificationsPage(): React.JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Read state from localStorage
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Load read state from localStorage on mount
  // Note: We don't persist "deleted" state - alerts should reappear as long as the condition exists
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Clean up old deleted_ids key - we no longer persist this
      localStorage.removeItem("notification_deleted_ids");

      const savedReadIds = localStorage.getItem("notification_read_ids");
      if (savedReadIds) {
        setReadIds(new Set(JSON.parse(savedReadIds)));
      }
    }
  }, []);

  // Fetch low stock alerts from API
  const fetchLowStockAlerts = useCallback(async (forceRefresh = false): Promise<void> => {
    console.log("[Notifications] Fetching low stock alerts, forceRefresh:", forceRefresh);
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const url = `/admin/low-stock-alerts${forceRefresh ? "?force_refresh=true" : ""}`;
      console.log("[Notifications] API URL:", url);

      const response = await api.get<LowStockResponse>(url);
      console.log("[Notifications] API Response:", response.data);

      const { alerts, last_checked } = response.data;

      // Convert low stock alerts to notifications
      const inventoryNotifications: Notification[] = alerts.map((alert) => ({
        id: `low-stock-${alert.variant_id}`,
        type: "inventory" as NotificationType,
        title: "Low Stock Alert",
        message: `${alert.product_title}${alert.variant_title !== "Default" ? ` - ${alert.variant_title}` : ""} is running low (${alert.current_stock} units left, threshold: ${alert.min_stock_alert})`,
        timestamp: new Date(alert.checked_at),
        read: readIds.has(`low-stock-${alert.variant_id}`),
        link: `/admin/products/edit/${alert.product_id}`,
      }));

      console.log("[Notifications] Converted to notifications:", inventoryNotifications);
      setNotifications(inventoryNotifications);
      setLastChecked(last_checked);
    } catch (err: unknown) {
      console.error("[Notifications] Failed to fetch:", err);
      const axiosError = err as { response?: { data?: unknown; status?: number } };
      console.error("[Notifications] Error response:", axiosError?.response?.data);
      console.error("[Notifications] Error status:", axiosError?.response?.status);
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [readIds]);

  // Fetch on mount and auto-refresh every 5 minutes
  useEffect(() => {
    fetchLowStockAlerts();

    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchLowStockAlerts(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchLowStockAlerts]);

  // Filter out deleted notifications
  const visibleNotifications = notifications.filter((n) => !deletedIds.has(n.id));

  const unreadCount = visibleNotifications.filter((n) => !n.read && !readIds.has(n.id)).length;

  const filteredNotifications = visibleNotifications.filter((n) => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  const handleMarkAsRead = (id: string): void => {
    const newReadIds = new Set(readIds);
    newReadIds.add(id);
    setReadIds(newReadIds);
    localStorage.setItem("notification_read_ids", JSON.stringify([...newReadIds]));

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = (): void => {
    const allIds = visibleNotifications.map((n) => n.id);
    const newReadIds = new Set([...readIds, ...allIds]);
    setReadIds(newReadIds);
    localStorage.setItem("notification_read_ids", JSON.stringify([...newReadIds]));

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDelete = (id: string): void => {
    // Only hide for current session - will reappear on refresh if condition still exists
    const newDeletedIds = new Set(deletedIds);
    newDeletedIds.add(id);
    setDeletedIds(newDeletedIds);
    // Don't persist to localStorage - alerts should reappear if the condition still exists
  };

  const handleClearAll = (): void => {
    // Only hide for current session - will reappear on refresh if conditions still exist
    const allIds = visibleNotifications.map((n) => n.id);
    const newDeletedIds = new Set([...deletedIds, ...allIds]);
    setDeletedIds(newDeletedIds);
    // Don't persist to localStorage
  };

  const handleRefresh = (): void => {
    fetchLowStockAlerts(true);
  };

  const filterButtons: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "order", label: "Orders" },
    { value: "inventory", label: "Inventory" },
    { value: "customer", label: "Customers" },
    { value: "system", label: "System" },
  ];

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
            Notifications
          </h1>
          <p className="mt-1 font-public text-[14px] text-[#6A7282]">
            {loading
              ? "Loading..."
              : unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up!"}
          </p>
          {lastChecked && (
            <p className="mt-0.5 font-public text-[12px] text-[#9CA3AF]">
              Last checked: {new Date(lastChecked).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`cursor-pointer rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-public text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB] ${
              refreshing ? "opacity-50" : ""
            }`}
          >
            {refreshing ? "Checking..." : "Refresh"}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="cursor-pointer rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-public text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
            >
              Mark all as read
            </button>
          )}
          {visibleNotifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="cursor-pointer rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-public text-[14px] font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-public text-[14px] text-red-600">{error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={`cursor-pointer rounded-lg px-4 py-2 font-public text-[14px] font-medium transition-colors ${
              filter === btn.value
                ? "bg-[#030712] text-white"
                : "border border-[#E5E7EB] bg-white text-[#030712] hover:bg-[#F9FAFB]"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#030712] border-t-transparent" />
            <p className="mt-4 font-public text-[14px] text-[#6A7282]">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mb-4 text-[#D1D5DB]"
            >
              <path
                d="M20.534 42.0004C20.8856 42.6082 21.3906 43.1133 21.9987 43.4644C22.6067 43.8154 23.2964 44.0003 23.9985 44.0003C24.7006 44.0003 25.3904 43.8154 25.9984 43.4644C26.6065 43.1133 27.1114 42.6082 27.463 42.0004M6.52254 30.6524C6.26126 30.9388 6.08886 31.2951 6.02625 31.6774C5.96364 32.0597 6.01359 32.4523 6.16996 32.8072C6.32633 33.1621 6.58243 33.4634 6.90705 33.6753C7.23168 33.8871 7.61091 33.9999 7.99854 34.0004H39.9985C40.3862 34.0001 40.7655 33.8876 41.0904 33.6759C41.4152 33.4642 41.6716 33.1631 41.8283 32.8082C41.9849 32.4534 42.0352 32.0607 41.9728 31.6783C41.9105 31.2959 41.7383 30.9394 41.4772 30.6528C38.8185 27.9124 35.9985 24.9984 35.9985 16.0004C35.9985 12.8178 34.7342 9.76556 32.4838 7.51516C30.2334 5.26476 27.1811 4.00043 23.9985 4.00043C20.816 4.00043 17.7637 5.26476 15.5133 7.51516C13.2629 9.76556 11.9985 12.8178 11.9985 16.0004C11.9985 24.9984 9.17654 27.9124 6.52254 30.6524Z"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="font-public text-[16px] font-medium text-[#6A7282]">
              {filter === "all" ? "No notifications" : `No ${filter} notifications`}
            </p>
            <p className="mt-1 font-public text-[14px] text-[#9CA3AF]">
              {filter === "all"
                ? "All products are above their minimum stock levels"
                : filter === "inventory"
                ? "All products are above their minimum stock levels"
                : "No notifications of this type"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {filteredNotifications.map((notification) => {
              const isRead = notification.read || readIds.has(notification.id);
              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 transition-colors hover:bg-[#F9FAFB] ${getNotificationBgColor(
                    notification.type,
                    isRead
                  )}`}
                >
                  {/* Icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getNotificationIconBgColor(
                      notification.type
                    )}`}
                  >
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3
                          className={`font-public text-[14px] leading-[150%] ${
                            isRead ? "font-normal text-[#030712]" : "font-semibold text-[#030712]"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="mt-0.5 font-public text-[14px] text-[#6A7282]">{notification.message}</p>
                        <p className="mt-1 font-public text-[12px] text-[#9CA3AF]">
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="cursor-pointer rounded-lg p-2 text-[#6A7282] transition-colors hover:bg-[#E5E7EB] hover:text-[#030712]"
                            title="Mark as read"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M13.3337 4L6.00033 11.3333L2.66699 8"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="cursor-pointer rounded-lg p-2 text-[#6A7282] transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M2 4H3.33333H14M5.33333 4V2.66667C5.33333 2.31305 5.47381 1.97391 5.72386 1.72386C5.97391 1.47381 6.31304 1.33333 6.66667 1.33333H9.33333C9.68696 1.33333 10.0261 1.47381 10.2761 1.72386C10.5262 1.97391 10.6667 2.31305 10.6667 2.66667V4M12.6667 4V13.3333C12.6667 13.687 12.5262 14.0261 12.2761 14.2761C12.0261 14.5262 11.687 14.6667 11.3333 14.6667H4.66667C4.31304 14.6667 3.97391 14.5262 3.72386 14.2761C3.47381 14.0261 3.33333 13.687 3.33333 13.3333V4H12.6667Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        {notification.link && (
                          <a
                            href={notification.link}
                            className="cursor-pointer rounded-lg p-2 text-[#6A7282] transition-colors hover:bg-[#E5E7EB] hover:text-[#030712]"
                            title="View details"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M6 12L10 8L6 4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!isRead && (
                    <div className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="mt-6 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
        <h3 className="font-public text-[14px] font-medium text-[#030712]">About Stock Alerts</h3>
        <p className="mt-1 font-public text-[13px] text-[#6A7282]">
          Low stock alerts are automatically generated when a product&apos;s inventory falls at or below its
          configured &quot;Min Stock Alert&quot; threshold. You can set this threshold in the product edit page
          for each variant.
        </p>
      </div>
    </div>
  );
}
