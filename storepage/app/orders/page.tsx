"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ProfileSidebar from "@/components/layout/ProfileSidebar";
import { useOrdersQuery } from "@/lib/queries";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Package, Star } from "lucide-react";

// Order status tabs
const STATUS_TABS = [
  { key: "all", label: "All orders" },
  { key: "pending", label: "Confirm" },
  { key: "processing", label: "Packing" },
  { key: "shipped", label: "Delivering" },
  { key: "completed", label: "Completed" },
  { key: "canceled", label: "Canceled" },
];

// Map fulfillment status to tab key
const mapStatusToTab = (fulfillmentStatus: string, orderStatus: string) => {
  if (orderStatus === "canceled") return "canceled";
  switch (fulfillmentStatus?.toLowerCase()) {
    case "not_fulfilled":
      return "pending";
    case "packed":
    case "packing":
      return "processing";
    case "shipped":
    case "delivering":
      return "shipped";
    case "delivered":
    case "completed":
      return "completed";
    default:
      return "pending";
  }
};

// Get status badge style and label
const getStatusBadge = (fulfillmentStatus: string, orderStatus: string) => {
  if (orderStatus === "canceled") {
    return { label: "Canceled", className: "bg-red-50 text-red-600" };
  }
  switch (fulfillmentStatus?.toLowerCase()) {
    case "not_fulfilled":
      return { label: "Waiting", className: "bg-gray-100 text-gray-600" };
    case "packed":
    case "packing":
      return { label: "Packing", className: "bg-blue-50 text-blue-600" };
    case "shipped":
    case "delivering":
      return { label: "Delivering", className: "bg-orange-50 text-orange-600" };
    case "delivered":
    case "completed":
      return { label: "Completed", className: "bg-green-50 text-green-600" };
    default:
      return { label: "Waiting", className: "bg-gray-100 text-gray-600" };
  }
};

// Generate order ID format
const formatOrderId = (displayId: number, createdAt: string) => {
  const date = new Date(createdAt);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `#ORD-${day}${month}${year}HS`;
};

// Calculate estimated arrival (7 days from order date)
const getEstimatedArrival = (createdAt: string) => {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + 7);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function OrdersPage() {
  const { data: orders, isLoading: loading, error: queryError } = useOrdersQuery();
  const error = queryError as Error | null;
  const [activeTab, setActiveTab] = useState("all");

  // Filter orders based on active tab
  const filteredOrders = orders?.filter((order: any) => {
    if (activeTab === "all") return true;
    const tabKey = mapStatusToTab(order.fulfillment_status, order.status);
    return tabKey === activeTab;
  }) || [];

  if (loading) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-center min-h-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#23429B] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Failed to load orders</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-8">
        <a href="/" className="hover:text-gray-900">Home</a>
        <span>›</span>
        <span className="text-gray-900 font-medium">My Orders</span>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left Sidebar */}
        <ProfileSidebar activeMenu="My orders" />

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">My orders</h1>
              <p className="text-sm text-gray-500">Monitor your current orders and ensure they match the delivery.</p>
            </div>

            {/* Status Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex overflow-x-auto scrollbar-hide">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List */}
            <div className="p-4 sm:p-6">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-4">No orders found</p>
                  <Button onClick={() => window.location.href = "/"}>
                    Start Shopping
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order: any) => {
                    const statusBadge = getStatusBadge(order.fulfillment_status, order.status);
                    const firstItem = order.items?.[0];
                    
                    return (
                      <div 
                        key={order.id}
                        className="border border-gray-200 rounded-xl p-4 sm:p-5"
                      >
                        {/* Order Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                ID : {formatOrderId(order.display_id, order.created_at)}
                              </p>
                              <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Est. Arrive at {getEstimatedArrival(order.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${statusBadge.className}`}>
                            <Calendar className="w-4 h-4" />
                            {statusBadge.label}
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-white rounded-lg overflow-hidden border border-gray-200 shrink-0">
                              {firstItem?.thumbnail ? (
                                <Image
                                  src={firstItem.thumbnail}
                                  alt={firstItem.title}
                                  width={80}
                                  height={80}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Package className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {firstItem?.title || "Product"}
                                {order.items?.length > 1 && (
                                  <span className="text-gray-500 font-normal"> +{order.items.length - 1} more</span>
                                )}
                              </h3>
                              <p className="text-blue-600 font-bold">
                                Total : RM{((order.total || 0) / 100).toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Payment & Shipping Info */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            {/* Payment Method */}
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-8 h-5 bg-red-500 rounded flex items-center justify-center">
                                <div className="flex gap-0.5">
                                  <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                </div>
                              </div>
                              <span className="font-medium text-gray-900">
                                {order.payment_status === "captured" ? "Paid" : "Credit Card"}
                              </span>
                            </div>
                            {/* Shipping Address */}
                            <p className="text-sm text-gray-500">
                              Penghantaran ke: {[
                                order.shipping_address?.city,
                                order.shipping_address?.province || order.shipping_address?.address_1,
                                order.shipping_address?.country_code?.toUpperCase() === "MY" ? "Malaysia" : order.shipping_address?.country_code?.toUpperCase()
                              ].filter(Boolean).join(", ") || "Address not set"}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-3">
                            <Link href={`/orders/${order.id}`}>
                              <Button className="bg-blue-900 hover:bg-blue-950 text-white px-6">
                                View details
                              </Button>
                            </Link>
                            {/* Review button - only for completed orders */}
                            {(order.fulfillment_status === "delivered" || order.fulfillment_status === "completed") && order.status !== "canceled" && (
                              <Link href={`/orders/${order.id}/review`}>
                                <Button 
                                  variant="outline" 
                                  className="border-yellow-400 text-yellow-600 hover:bg-yellow-50 px-6"
                                >
                                  <Star className="w-4 h-4 mr-1.5" />
                                  Review
                                </Button>
                              </Link>
                            )}
                            {order.status !== "canceled" && order.fulfillment_status === "not_fulfilled" && (
                              <Button 
                                variant="outline" 
                                className="border-red-200 text-red-600 hover:bg-red-50 px-6"
                              >
                                Cancel order
                              </Button>
                            )}
                            {order.fulfillment_status !== "not_fulfilled" && order.status !== "canceled" && order.fulfillment_status !== "delivered" && order.fulfillment_status !== "completed" && (
                              <Button 
                                variant="outline" 
                                className="border-gray-200 text-gray-700 hover:bg-gray-50 px-6"
                              >
                                Contact admin
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
