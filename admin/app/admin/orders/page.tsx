"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OrderStatsCards, OrderToolbar, OrdersList, OrderDetailsDrawer, EasyParcelShippingDrawer } from "@/components/admin";
import type { BulkShippingData } from "@/components/admin/BulkShippingDrawer";
import type { EasyParcelShippingInfo } from "@/lib/api/easyparcel";
import { shipWithEasyParcel } from "@/lib/api/easyparcel";
import { useOrders, useOrderStats, useOrder, useOrdersReturns } from "@/lib/api/queries";
import { cancelOrder, restoreOrder, shipOrder, markAsDelivered, bulkShipOrders, bulkMarkAsDelivered, updateOrderShippingMethod } from "@/lib/api/orders";
import type { EasyParcelShippingInfo as OrderEasyParcelShippingInfo } from "@/lib/api/orders";
import { useToast } from "@/contexts/ToastContext";
import { useBulkShipping } from "@/contexts/BulkShippingContext";
import { useQueryClient } from "@tanstack/react-query";
import type { Order, OrderFilter } from "@/lib/validators/order";

// Loading fallback for Suspense boundary
function OrdersPageLoading(): React.JSX.Element {
  return (
    <div className="px-4 md:px-8">
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[100px] animate-pulse rounded-lg border border-[#E5E5E5] bg-gray-100" />
        ))}
      </div>
      <div className="h-[400px] animate-pulse rounded-lg border border-[#E5E5E5] bg-gray-100" />
    </div>
  );
}

const ORDERS_PER_PAGE = 10;

// Valid filter options for client-side validation
const VALID_SORT_OPTIONS = ["newest", "oldest", "highest", "lowest"] as const;
// Smart filter options used in the UI (user-friendly groupings)
const VALID_SMART_FILTER_OPTIONS = ["all", "ready_to_ship", "in_transit", "delivered", "awaiting_payment", "cancelled"] as const;
const VALID_DATE_RANGE_OPTIONS = ["all", "today", "yesterday", "this_week", "last_week", "this_month", "last_month"] as const;

type SortOption = typeof VALID_SORT_OPTIONS[number];
type SmartFilterOption = typeof VALID_SMART_FILTER_OPTIONS[number];
type DateRangeOption = typeof VALID_DATE_RANGE_OPTIONS[number];

/**
 * Translates UI smart filter values to API filter parameters.
 * Smart filters are user-friendly groupings that may require multiple API parameters.
 */
function translateSmartFilterToApiParams(smartFilter: SmartFilterOption): Pick<OrderFilter, "fulfillment_status" | "payment_status"> {
  switch (smartFilter) {
    case "ready_to_ship":
      // Ready to ship = paid orders that are unfulfilled
      return { fulfillment_status: "unfulfilled", payment_status: "paid" };
    case "in_transit":
      // In transit = shipped orders
      return { fulfillment_status: "shipped" };
    case "delivered":
      // Completed = delivered orders
      return { fulfillment_status: "delivered" };
    case "awaiting_payment":
      // Awaiting payment = unpaid orders
      return { payment_status: "awaiting" };
    case "cancelled":
      // Cancelled orders
      return { fulfillment_status: "cancelled" };
    case "all":
    default:
      // All orders - no filter
      return {};
  }
}

// Type guards for validation
function isValidSortOption(value: string): value is SortOption {
  return VALID_SORT_OPTIONS.includes(value as SortOption);
}

function isValidSmartFilterOption(value: string): value is SmartFilterOption {
  return VALID_SMART_FILTER_OPTIONS.includes(value as SmartFilterOption);
}

function isValidDateRangeOption(value: string): value is DateRangeOption {
  return VALID_DATE_RANGE_OPTIONS.includes(value as DateRangeOption);
}

/**
 * Escape a string for CSV format
 * Doubles any quotes and wraps in quotes
 */
function escapeCsvValue(value: string): string {
  // Replace double quotes with two double quotes (CSV escape)
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Check if an order is eligible for bulk shipping
 * Paid orders that are unfulfilled or processing (not yet shipped) are eligible
 * Note: Medusa 2.x uses "captured" instead of "paid" for successful payments
 */
function isOrderEligibleForShipping(order: Order): boolean {
  const isPaid = order.payment_status === "paid" || order.payment_status === "captured";
  return isPaid &&
    (order.fulfillment_status === "unfulfilled" || order.fulfillment_status === "processing");
}

/**
 * Get a human-readable reason why an order is not eligible for shipping
 */
function getIneligibilityReason(order: Order): string {
  if (order.status === "cancelled") {
    return "cancelled";
  }
  if (order.payment_status === "awaiting") {
    return "awaiting payment";
  }
  if (order.payment_status === "refunded" || order.payment_status === "partially_refunded") {
    return "refunded";
  }
  if (order.fulfillment_status === "shipped") {
    return "already shipped";
  }
  if (order.fulfillment_status === "delivered") {
    return "already delivered";
  }
  if (order.fulfillment_status === "cancelled") {
    return "fulfillment cancelled";
  }
  return "not ready for shipping";
}

/**
 * Check if an order is eligible for marking as delivered
 * Only shipped orders can be marked as delivered
 */
function isOrderEligibleForDelivery(order: Order): boolean {
  return order.fulfillment_status === "shipped";
}

/**
 * Determine the bulk action type based on selected orders
 * Returns "ship" if mostly ready-to-ship orders, "deliver" if mostly in-transit orders
 */
type BulkActionType = "ship" | "deliver" | "mixed";

function determineBulkActionType(selectedOrdersList: Order[]): BulkActionType {
  if (selectedOrdersList.length === 0) return "ship";

  const shippableCount = selectedOrdersList.filter(isOrderEligibleForShipping).length;
  const deliverableCount = selectedOrdersList.filter(isOrderEligibleForDelivery).length;

  // If all selected are shippable, show ship action
  if (shippableCount === selectedOrdersList.length) return "ship";

  // If all selected are deliverable (in transit), show deliver action
  if (deliverableCount === selectedOrdersList.length) return "deliver";

  // If majority are shippable
  if (shippableCount > deliverableCount) return "ship";

  // If majority are deliverable
  if (deliverableCount > shippableCount) return "deliver";

  // Equal or mixed - default to ship since it's the primary action
  return "mixed";
}

function OrdersPageContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, showUndoToast, confirm } = useToast();
  const queryClient = useQueryClient();
  const { isOpen: isBulkShippingOpen, openBulkShipping, setOnSubmit, closeBulkShipping, updateSelectedOrders } = useBulkShipping();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<SmartFilterOption>("all");
  const [dateRange, setDateRange] = useState<DateRangeOption>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // EasyParcel shipping drawer state
  const [isEasyParcelDrawerOpen, setIsEasyParcelDrawerOpen] = useState(false);
  const [easyParcelOrder, setEasyParcelOrder] = useState<Order | null>(null);
  const [easyParcelShippingInfo, setEasyParcelShippingInfo] = useState<EasyParcelShippingInfo | null>(null);
  const [isShippingWithEasyParcel, setIsShippingWithEasyParcel] = useState(false);

  // Get order ID from URL query param for deep linking
  const orderIdFromUrl = searchParams.get("order");

  // Fetch single order if ID is provided in URL (enabled only when we have an ID)
  const {
    data: orderFromUrl,
    isSuccess: isUrlOrderSuccess,
  } = useOrder(orderIdFromUrl || "");

  // Track if we've already opened the drawer for this URL param
  const urlOrderProcessedRef = useRef<string | null>(null);

  // Auto-open drawer when navigating with order ID in URL
  useEffect(() => {
    // Check if we have a new order ID to process
    if (
      orderIdFromUrl &&
      isUrlOrderSuccess &&
      orderFromUrl &&
      urlOrderProcessedRef.current !== orderIdFromUrl
    ) {
      // Mark as processed to prevent re-triggering
      urlOrderProcessedRef.current = orderIdFromUrl;

      // Open the drawer with the fetched order
      setSelectedOrder(orderFromUrl);
      setIsDrawerOpen(true);

      // Clear the URL param after drawer opens
      setTimeout(() => {
        router.replace("/admin/orders", { scroll: false });
      }, 100);
    }
  }, [orderIdFromUrl, orderFromUrl, isUrlOrderSuccess, router]);

  // Reset the processed ref when URL param is cleared
  useEffect(() => {
    if (!orderIdFromUrl) {
      urlOrderProcessedRef.current = null;
    }
  }, [orderIdFromUrl]);

  // Calculate offset for pagination
  const offset = (currentPage - 1) * ORDERS_PER_PAGE;

  // Fetch order stats from API
  const { data: statsData, isLoading: isLoadingStats } = useOrderStats();

  // Translate smart filter to API parameters
  const apiFilterParams = translateSmartFilterToApiParams(filterBy);

  // Fetch orders from API with filters
  const { data: ordersData, isLoading: isLoadingOrders } = useOrders({
    search: searchQuery || undefined,
    sort_by: sortBy,
    fulfillment_status: apiFilterParams.fulfillment_status,
    payment_status: apiFilterParams.payment_status,
    date_range: dateRange !== "all" ? dateRange : undefined,
    limit: ORDERS_PER_PAGE,
    offset,
  });

  // Calculate pagination
  const totalOrders = ordersData?.count || 0;
  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);
  const orders = ordersData?.orders || [];

  // Fetch returns for displayed orders
  const orderIds = orders.map((o) => o.id);
  const { data: returnsMap } = useOrdersReturns(orderIds);

  // Set up the submit handler for bulk shipping
  useEffect(() => {
    const handleBulkShippingSubmit = async (data: BulkShippingData): Promise<void> => {
      try {
        showToast(`Arranging pickup for ${data.orderIds.length} order(s)...`, "info");

        const result = await bulkShipOrders({
          order_ids: data.orderIds,
          courier: data.courier,
          pickup_date: data.pickupDate,
          pickup_time: data.pickupTime,
        });

        closeBulkShipping();
        setSelectedOrders(new Set());

        // Refresh orders list and stats
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        queryClient.invalidateQueries({ queryKey: ["orderStats"] });

        // Show success/failure feedback
        if (result.success) {
          showToast(`Successfully arranged pickup for ${result.shipped} order(s)!`, "success");
        } else if (result.shipped > 0) {
          showToast(`Shipped ${result.shipped} of ${result.total} orders. ${result.failed} failed.`, "warning");
        } else {
          showToast("Failed to arrange pickup. Please try again.", "error");
        }
      } catch (error) {
        // Log detailed error only in development
        if (process.env.NODE_ENV === "development") {
          console.error("Bulk shipping failed:", error);
        }
        showToast("Failed to arrange pickup. Please try again.", "error");
      }
    };

    setOnSubmit(handleBulkShippingSubmit);
  }, [setOnSubmit, showToast, closeBulkShipping, queryClient]);

  // Update bulk shipping drawer when selection changes while it's open
  // Note: We only update when the drawer is open AND there are visible selected orders
  // This prevents infinite loops from context updates
  // IMPORTANT: Only include orders eligible for shipping (paid + unfulfilled)
  useEffect(() => {
    if (isBulkShippingOpen && orders.length > 0) {
      const selectedOrdersList = orders.filter((o) => selectedOrders.has(o.id));
      // Only include shippable orders in the bulk shipping drawer
      const shippableOrders = selectedOrdersList.filter(isOrderEligibleForShipping);
      // Only update if we have shippable orders to show
      if (shippableOrders.length > 0) {
        updateSelectedOrders(shippableOrders);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrders, orders, isBulkShippingOpen]);

  // Handle filter changes (reset to page 1) with validation
  const handleSearchChange = useCallback((value: string): void => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((value: string): void => {
    if (isValidSortOption(value)) {
      setSortBy(value);
      setCurrentPage(1);
    }
  }, []);

  const handleFilterChange = useCallback((value: string): void => {
    if (isValidSmartFilterOption(value)) {
      setFilterBy(value);
      setCurrentPage(1);
    }
  }, []);

  const handleDateRangeChange = useCallback((value: string): void => {
    if (isValidDateRangeOption(value)) {
      setDateRange(value);
      setCurrentPage(1);
    }
  }, []);

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    // Scroll to top on page change
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExport = (): void => {
    let blobUrl: string | null = null;

    try {
      setIsExporting(true);

      // Generate CSV content with proper escaping
      const headers = ["Order ID", "Customer", "Email", "Total", "Status", "Date"];
      const rows = orders.map((order) => [
        `#${order.display_id}`,
        order.customer_name,
        order.customer_email,
        `$ ${(order.total / 100).toFixed(2)}`,
        order.status,
        new Date(order.created_at).toLocaleDateString(),
      ]);

      const csvContent = [
        headers.map(escapeCsvValue).join(","),
        ...rows.map((row) => row.map(escapeCsvValue).join(",")),
      ].join("\n");

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Orders exported successfully!", "success");
    } catch (error) {
      // Log detailed error only in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to export orders:", error);
      }
      showToast("Failed to export orders. Please try again.", "error");
    } finally {
      // Always cleanup blob URL to prevent memory leaks
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
      setIsExporting(false);
    }
  };

  const handleCancelOrder = async (orderId: string): Promise<void> => {
    // Find the order to get details
    const order = orders.find((o) => o.id === orderId);

    const confirmed = await confirm({
      title: "Cancel Order",
      message: "Are you sure you want to cancel this order?",
      confirmText: "Reject",
      cancelText: "Cancel",
      orderDetails: order ? {
        orderId: `ORD-${order.display_id}`,
        paymentMethod: order.payment_method || "N/A",
        paymentTime: new Date(order.created_at).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      } : undefined,
    });

    if (!confirmed) {
      return;
    }

    try {
      const result = await cancelOrder(orderId);
      // Refresh orders list and stats
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orderStats"] });

      // Build message with points info if applicable
      let cancelMessage = "The transaction was deleted.";
      if (result.points) {
        const pointsParts: string[] = [];
        if (result.points.points_deducted > 0) {
          pointsParts.push(`${result.points.points_deducted} points deducted`);
        }
        if (result.points.points_restored > 0) {
          pointsParts.push(`${result.points.points_restored} points restored`);
        }
        if (pointsParts.length > 0) {
          cancelMessage += ` (${pointsParts.join(", ")})`;
        }
      }

      // Show undo toast with restore functionality
      showUndoToast(cancelMessage, async () => {
        try {
          await restoreOrder(orderId);
          showToast(`Order #${order?.display_id || orderId} has been restored.`, "success");
          // Refresh orders list and stats
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          queryClient.invalidateQueries({ queryKey: ["orderStats"] });
        } catch (restoreError) {
          // Log detailed error only in development
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to restore order:", restoreError);
          }
          showToast("Failed to restore order. Please try again.", "error");
        }
      });
    } catch (error) {
      // Log detailed error only in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to cancel order:", error);
      }
      showToast("Failed to cancel order. Please try again.", "error");
    }
  };

  const handleSelectOrder = async (orderId: string, selected: boolean): Promise<void> => {
    // Find the order to check eligibility
    const order = orders.find((o) => o.id === orderId);

    // Allow selection if order is eligible for shipping OR delivery
    // - Shipping: paid + unfulfilled
    // - Delivery: shipped (in transit)
    if (selected && order) {
      const canShip = isOrderEligibleForShipping(order);
      const canDeliver = isOrderEligibleForDelivery(order);

      // If not eligible for any bulk action, show popup warning
      if (!canShip && !canDeliver) {
        const reason = getIneligibilityReason(order);
        await confirm({
          title: "Cannot Select Order",
          message: `Order #${order.display_id} is ${reason} and cannot be included in bulk actions.`,
          type: "warning",
          confirmText: "OK",
          cancelText: "Close",
        });
        // Don't add the order to selection
        return;
      }
    }

    setSelectedOrders((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  const handleViewDetails = (order: Order): void => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = (): void => {
    setIsDrawerOpen(false);
  };

  const handleMarkAsShipped = async (orderId: string): Promise<void> => {
    // For now, use a simple shipping flow - in the future, this could open a modal for tracking info
    try {
      await shipOrder(orderId, {
        courier: "Standard Shipping",
        tracking_number: `TRK-${Date.now()}`,
      });
      // Refresh orders list and stats
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orderStats"] });
      showToast("Order marked as shipped!", "success");
      // Update the selected order if drawer is open
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, fulfillment_status: "shipped" } : null);
      }
    } catch (error) {
      // Log detailed error only in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to mark order as shipped:", error);
      }
      showToast("Failed to mark order as shipped. Please try again.", "error");
    }
  };

  const handleMarkAsDelivered = async (orderId: string): Promise<void> => {
    try {
      await markAsDelivered(orderId);
      // Refresh orders list and stats
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orderStats"] });
      showToast("Order marked as delivered!", "success");
      // Update the selected order if drawer is open
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? { ...prev, fulfillment_status: "delivered" } : null);
      }
    } catch (error) {
      // Log detailed error only in development
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to mark order as delivered:", error);
      }
      showToast("Failed to mark order as delivered. Please try again.", "error");
    }
  };

  const handleCancelOrderFromDrawer = async (orderId: string): Promise<void> => {
    // Use the existing cancel order flow
    await handleCancelOrder(orderId);
    // Close the drawer after cancellation
    setIsDrawerOpen(false);
  };

  const handleRequestReturn = (orderId: string): void => {
    // Navigate to the Returns page with order_id as query parameter
    // This will pre-select the order for creating a return
    setIsDrawerOpen(false);
    router.push(`/admin/returns?create_for=${encodeURIComponent(orderId)}`);
  };

  const handleViewReturn = (returnId: string): void => {
    // Navigate to the Returns page with the return ID to view details
    setIsDrawerOpen(false);
    router.push(`/admin/returns?view=${encodeURIComponent(returnId)}`);
  };

  // EasyParcel shipping handlers
  const handleShipWithEasyParcel = async (orderId: string, shippingInfo: EasyParcelShippingInfo): Promise<void> => {
    // Find the order
    const order = orders.find((o) => o.id === orderId) || selectedOrder;
    if (!order) {
      showToast("Order not found", "error");
      return;
    }

    // Open the EasyParcel shipping drawer
    setEasyParcelOrder(order);
    setEasyParcelShippingInfo(shippingInfo);
    setIsEasyParcelDrawerOpen(true);
    // Close the order details drawer
    setIsDrawerOpen(false);
  };

  const handleCloseEasyParcelDrawer = (): void => {
    if (!isShippingWithEasyParcel) {
      setIsEasyParcelDrawerOpen(false);
      setEasyParcelOrder(null);
      setEasyParcelShippingInfo(null);
    }
  };

  const handleEasyParcelShippingSubmit = async (data: {
    weight: number;
    content: string;
    pickup_date: string;
    pickup_time: string;
  }): Promise<void> => {
    if (!easyParcelOrder || !easyParcelShippingInfo) return;

    setIsShippingWithEasyParcel(true);

    try {
      // Build receiver info from shipping address
      const shippingAddress = easyParcelOrder.shipping_address;
      if (!shippingAddress) {
        throw new Error("Order has no shipping address");
      }

      const receiverInfo = {
        name: `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim() || "Customer",
        phone: shippingAddress.phone || "",
        address: [shippingAddress.address_1, shippingAddress.address_2].filter(Boolean).join(", "),
        postcode: shippingAddress.postal_code || "",
        country: shippingAddress.country_code?.toUpperCase() || "SG",
      };

      // Validate required fields
      if (!receiverInfo.phone) {
        throw new Error("Customer phone number is required for shipping");
      }
      if (!receiverInfo.address) {
        throw new Error("Customer address is required for shipping");
      }
      if (!receiverInfo.postcode) {
        throw new Error("Customer postal code is required for shipping");
      }

      // Call EasyParcel API
      const result = await shipWithEasyParcel(
        easyParcelOrder.id,
        easyParcelShippingInfo,
        receiverInfo,
        {
          weight: data.weight,
          content: data.content,
          pickup_date: data.pickup_date,
          pickup_time: data.pickup_time,
        }
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      // Update order status to shipped with AWB info
      await shipOrder(easyParcelOrder.id, {
        courier: easyParcelShippingInfo.courier_name,
        tracking_number: result.awb || "",
      });

      // Refresh orders list and stats
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orderStats"] });

      // Close the drawer
      setIsEasyParcelDrawerOpen(false);
      setEasyParcelOrder(null);
      setEasyParcelShippingInfo(null);

      // Show success message
      showToast(
        result.awb
          ? `Shipment created! AWB: ${result.awb}`
          : "Shipment created successfully!",
        "success"
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create shipment";
      showToast(errorMessage, "error");
      if (process.env.NODE_ENV === "development") {
        console.error("EasyParcel shipping failed:", error);
      }
    } finally {
      setIsShippingWithEasyParcel(false);
    }
  };

  const handleCancelSelect = (): void => {
    setSelectedOrders(new Set());
  };

  const handleMassArrangePickup = (): void => {
    // Get selected orders as Order objects
    const selectedOrdersList = orders.filter((o) => selectedOrders.has(o.id));

    // Filter to only eligible orders
    const eligibleOrders = selectedOrdersList.filter(isOrderEligibleForShipping);
    const ineligibleOrders = selectedOrdersList.filter((o) => !isOrderEligibleForShipping(o));

    // If no eligible orders, show warning and don't open drawer
    if (eligibleOrders.length === 0) {
      showToast("No orders are ready for shipping. Only paid and unfulfilled orders can be shipped.", "warning");
      return;
    }

    // If some orders are ineligible, show warning
    if (ineligibleOrders.length > 0) {
      const skippedIds = ineligibleOrders.map((o) => `#${o.display_id}`).join(", ");
      showToast(`Skipped ${ineligibleOrders.length} order(s) not ready for shipping: ${skippedIds}`, "warning");
    }

    // Open bulk shipping with only eligible orders
    openBulkShipping(eligibleOrders);
  };

  // Handler for updating shipping method on free shipping orders
  const handleUpdateOrderShipping = async (orderId: string, shippingInfo: OrderEasyParcelShippingInfo): Promise<void> => {
    try {
      await updateOrderShippingMethod(orderId, shippingInfo);
      // Refresh orders list
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      showToast(`Shipping method updated: ${shippingInfo.courier_name}`, "success");
      // Update the selected order if drawer is open
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => prev ? {
          ...prev,
          metadata: {
            ...prev.metadata,
            easyparcel_shipping: shippingInfo,
            shipping_pending_admin_selection: false,
            free_shipping_no_method_selected: false,
          }
        } : null);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to update shipping method:", error);
      }
      showToast("Failed to update shipping method. Please try again.", "error");
      throw error;
    }
  };

  const handleMassMarkAsDelivered = async (): Promise<void> => {
    // Get selected orders as Order objects
    const selectedOrdersList = orders.filter((o) => selectedOrders.has(o.id));

    // Filter to only eligible orders (shipped/in-transit)
    const eligibleOrders = selectedOrdersList.filter(isOrderEligibleForDelivery);
    const ineligibleOrders = selectedOrdersList.filter((o) => !isOrderEligibleForDelivery(o));

    // If no eligible orders, show warning
    if (eligibleOrders.length === 0) {
      showToast("No orders are in transit. Only shipped orders can be marked as delivered.", "warning");
      return;
    }

    // Confirm action
    const confirmed = await confirm({
      title: "Mark Orders as Delivered",
      message: `Are you sure you want to mark ${eligibleOrders.length} order(s) as delivered?`,
      confirmText: "Mark as Delivered",
      cancelText: "Cancel",
    });

    if (!confirmed) {
      return;
    }

    try {
      showToast(`Marking ${eligibleOrders.length} order(s) as delivered...`, "info");

      const result = await bulkMarkAsDelivered(eligibleOrders.map((o) => o.id));

      setSelectedOrders(new Set());

      // Refresh orders list and stats
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orderStats"] });

      // Show success/failure feedback
      if (result.success) {
        showToast(`Successfully marked ${result.delivered} order(s) as delivered!`, "success");
      } else if (result.delivered > 0) {
        showToast(`Delivered ${result.delivered} of ${result.total} orders. ${result.failed} failed.`, "warning");
      } else {
        showToast("Failed to mark orders as delivered. Please try again.", "error");
      }

      // If some orders were ineligible, show warning
      if (ineligibleOrders.length > 0) {
        const skippedIds = ineligibleOrders.map((o) => `#${o.display_id}`).join(", ");
        showToast(`Skipped ${ineligibleOrders.length} order(s) not in transit: ${skippedIds}`, "warning");
      }
    } catch (error) {
      // Log detailed error only in development
      if (process.env.NODE_ENV === "development") {
        console.error("Bulk mark as delivered failed:", error);
      }
      showToast("Failed to mark orders as delivered. Please try again.", "error");
    }
  };

  const hasSelectedOrders = selectedOrders.size > 0;

  // Determine what bulk action to show based on selected orders
  const selectedOrdersList = orders.filter((o) => selectedOrders.has(o.id));
  const bulkActionType = determineBulkActionType(selectedOrdersList);
  const shippableCount = selectedOrdersList.filter(isOrderEligibleForShipping).length;
  const deliverableCount = selectedOrdersList.filter(isOrderEligibleForDelivery).length;

  return (
    <div className="px-4 md:px-8">
      {/* Stats Cards */}
      <OrderStatsCards stats={statsData} isLoading={isLoadingStats} />

      {/* Transactions Section */}
      <div>
        <h2 className="mb-4 font-geist text-[20px] font-medium leading-[120%] tracking-[-0.4px] text-[#030712] md:mb-6">
          Transactions
        </h2>

        {/* Toolbar */}
        <OrderToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          filterBy={filterBy}
          onFilterChange={handleFilterChange}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          onExport={handleExport}
          isExporting={isExporting}
        />

        {/* Selection Actions */}
        {hasSelectedOrders && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-public text-[14px] text-[#6A7282]">
                {selectedOrders.size} Selected
              </span>
              {/* Show breakdown of order types */}
              {(shippableCount > 0 || deliverableCount > 0) && (
                <span className="font-public text-[12px] text-[#9CA3AF]">
                  ({shippableCount > 0 && `${shippableCount} ready to ship`}
                  {shippableCount > 0 && deliverableCount > 0 && ", "}
                  {deliverableCount > 0 && `${deliverableCount} in transit`})
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelSelect}
                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 font-public text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
              >
                Cancel Select
              </button>
              {/* Show both buttons when mixed selection, otherwise show relevant button */}
              {bulkActionType === "mixed" ? (
                <>
                  {shippableCount > 0 && (
                    <button
                      onClick={handleMassArrangePickup}
                      className="rounded-lg border border-[#030712] bg-white px-4 py-2 font-public text-[14px] font-medium text-[#030712] transition-colors hover:bg-[#F9FAFB]"
                    >
                      Arrange Pickup ({shippableCount})
                    </button>
                  )}
                  {deliverableCount > 0 && (
                    <button
                      onClick={handleMassMarkAsDelivered}
                      className="rounded-lg bg-[#030712] px-4 py-2 font-public text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937]"
                    >
                      Mark Delivered ({deliverableCount})
                    </button>
                  )}
                </>
              ) : bulkActionType === "deliver" ? (
                <button
                  onClick={handleMassMarkAsDelivered}
                  className="rounded-lg bg-[#030712] px-4 py-2 font-public text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937]"
                >
                  Mass Mark as Delivered
                </button>
              ) : (
                <button
                  onClick={handleMassArrangePickup}
                  className="rounded-lg bg-[#030712] px-4 py-2 font-public text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937]"
                >
                  Mass Arrange Pickup
                </button>
              )}
            </div>
          </div>
        )}

        {/* Orders List */}
        <OrdersList
          orders={orders}
          isLoading={isLoadingOrders}
          currentPage={currentPage}
          totalPages={totalPages}
          totalOrders={totalOrders}
          ordersPerPage={ORDERS_PER_PAGE}
          selectedOrders={selectedOrders}
          returnsMap={returnsMap}
          onPageChange={handlePageChange}
          onSelectOrder={handleSelectOrder}
          onCancel={handleCancelOrder}
          onViewDetails={handleViewDetails}
        />
      </div>

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        order={selectedOrder}
        returns={selectedOrder ? returnsMap?.get(selectedOrder.id) || [] : []}
        onMarkAsShipped={handleMarkAsShipped}
        onMarkAsDelivered={handleMarkAsDelivered}
        onCancelOrder={handleCancelOrderFromDrawer}
        onRequestReturn={handleRequestReturn}
        onViewReturn={handleViewReturn}
        onShipWithEasyParcel={handleShipWithEasyParcel}
        onUpdateOrderShipping={handleUpdateOrderShipping}
      />

      {/* EasyParcel Shipping Drawer */}
      <EasyParcelShippingDrawer
        isOpen={isEasyParcelDrawerOpen}
        onClose={handleCloseEasyParcelDrawer}
        order={easyParcelOrder}
        shippingInfo={easyParcelShippingInfo}
        onSubmit={handleEasyParcelShippingSubmit}
        isSubmitting={isShippingWithEasyParcel}
      />
    </div>
  );
}

// Wrap in Suspense boundary to allow useSearchParams during static generation
export default function OrdersPage(): React.JSX.Element {
  return (
    <Suspense fallback={<OrdersPageLoading />}>
      <OrdersPageContent />
    </Suspense>
  );
}
