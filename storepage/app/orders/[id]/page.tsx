"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import ProfileSidebar from "@/components/layout/ProfileSidebar";
import { useOrderQuery } from "@/lib/queries";
import { CheckCircle, Package, Truck, MapPin, Clock, AlertCircle } from "lucide-react";

// Order status configuration
const ORDER_STATUSES = [
  { key: "pending", label: "Order Placed", icon: Clock },
  { key: "processing", label: "Processing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: MapPin },
];

// Helper to get status index
function getStatusIndex(status: string): number {
  const statusMap: Record<string, number> = {
    pending: 0,
    processing: 1,
    shipped: 2,
    delivered: 3,
    completed: 3,
  };
  return statusMap[status?.toLowerCase()] ?? 0;
}

// Helper to format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrderDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params.id as string;
  const isSuccess = searchParams.get("success") === "true";
  
  const { data: order, isLoading: loading, error: queryError, refetch } = useOrderQuery(orderId);
  const error = queryError as Error | null;
  const refresh = () => refetch();
  const [showSuccessMessage, setShowSuccessMessage] = useState(isSuccess);

  // Hide success message after 5 seconds
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  if (loading) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-center min-h-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#23429B] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Failed to load order details</p>
          <Button onClick={() => refresh()}>Retry</Button>
        </div>
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex(order.fulfillment_status || order.status);

  return (
    <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-5 h-5" />
          <span>Order placed successfully!</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-8">
        <a href="/" className="hover:text-gray-900">Home</a>
        <span>›</span>
        <a href="/orders" className="hover:text-gray-900">Orders</a>
        <span>›</span>
        <span className="text-gray-900 font-medium">Order #{order.display_id || orderId.slice(-8)}</span>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left Sidebar */}
        <ProfileSidebar activeMenu="My orders" />

        {/* Main Content */}
        <div className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left Section - Order Details */}
            <div className="lg:col-span-2 space-y-0">
              {/* Order Status Tracker */}
              <div className="bg-white rounded-t-lg border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Order Status</h2>
                
                <div className="relative">
                  {/* Progress Bar */}
                  <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${(currentStatusIndex / (ORDER_STATUSES.length - 1)) * 100}%` }}
                    />
                  </div>

                  {/* Steps */}
                  <div className="relative flex justify-between">
                    {ORDER_STATUSES.map((status, index) => {
                      const isCompleted = index <= currentStatusIndex;
                      const isCurrent = index === currentStatusIndex;
                      const StatusIcon = status.icon;
                      
                      return (
                        <div key={status.key} className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center mb-2 transition-colors ${
                              isCompleted
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-400"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <StatusIcon className="w-5 h-5" />
                            )}
                          </div>
                          <span
                            className={`text-xs sm:text-sm font-medium ${
                              isCurrent ? "text-blue-600" : isCompleted ? "text-gray-900" : "text-gray-500"
                            }`}
                          >
                            {status.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Estimated Delivery */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Truck className="w-5 h-5" />
                    <span className="font-medium">
                      {currentStatusIndex < 3
                        ? "Estimated delivery: 3-5 business days"
                        : "Delivered successfully!"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="bg-white border-l border-r border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Timeline</h2>
                
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-600" />
                      <div className="w-0.5 h-full bg-gray-200" />
                    </div>
                    <div className="pb-4">
                      <p className="font-medium text-gray-900">Order Placed</p>
                      <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  
                  {order.updated_at !== order.created_at && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-300" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Last Updated</p>
                        <p className="text-sm text-gray-500">{formatDate(order.updated_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white border-l border-r border-b border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Order Items ({order.items?.length || 0})
                </h2>

                <div className="space-y-4">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-20 h-20 bg-white rounded-lg overflow-hidden shrink-0">
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item.title}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                        {item.variant?.title && item.variant.title !== "Default Variant" && (
                          <span className="inline-block px-2 py-0.5 bg-gray-200 text-xs text-gray-700 rounded mb-1">
                            {item.variant.title}
                          </span>
                        )}
                        <p className="text-sm text-gray-600">
                          {item.quantity} × RM{((item.unit_price || 0) / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          RM{(((item.unit_price || 0) * item.quantity) / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-b-lg border-l border-r border-b border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">RM{((order.subtotal || 0) / 100).toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-green-600">
                      {order.shipping_total ? `RM${(order.shipping_total / 100).toFixed(2)}` : "Free"}
                    </span>
                  </div>

                  {order.discount_total > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount</span>
                      <span className="text-green-600">-RM{((order.discount_total || 0) / 100).toFixed(2)}</span>
                    </div>
                  )}

                  {order.tax_total > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="text-gray-900">RM{((order.tax_total || 0) / 100).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Total</span>
                      <span className="text-xl font-bold text-blue-600">
                        RM{((order.total || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="space-y-4">
              {/* Order Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Order Info</h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Order ID</p>
                    <p className="font-mono text-sm font-medium">#{order.display_id || orderId.slice(-8)}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Order Date</p>
                    <p className="text-sm font-medium">{formatDate(order.created_at)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Payment Status</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      order.payment_status === "captured"
                        ? "bg-green-100 text-green-800"
                        : order.payment_status === "awaiting"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {order.payment_status || "Pending"}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Fulfillment Status</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      order.fulfillment_status === "fulfilled"
                        ? "bg-green-100 text-green-800"
                        : order.fulfillment_status === "partially_fulfilled"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {order.fulfillment_status || "Not fulfilled"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {order.shipping_address && (
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Shipping Address</h2>
                  
                  <div className="text-sm text-gray-600">
                    <p className="font-medium text-gray-900">
                      {order.shipping_address.first_name} {order.shipping_address.last_name}
                    </p>
                    <p>{order.shipping_address.address_1}</p>
                    {order.shipping_address.address_2 && <p>{order.shipping_address.address_2}</p>}
                    <p>
                      {order.shipping_address.city}, {order.shipping_address.postal_code}
                    </p>
                    <p>{order.shipping_address.country_code?.toUpperCase()}</p>
                    {order.shipping_address.phone && (
                      <p className="mt-2">{order.shipping_address.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
                
                <div className="space-y-3">
                  <Button className="w-full" variant="outline">
                    <Package className="w-4 h-4 mr-2" />
                    Track Package
                  </Button>
                  
                  <Button className="w-full" variant="outline">
                    Download Invoice
                  </Button>

                  {order.status === "pending" && (
                    <Button 
                      className="w-full text-red-600 border-red-200 hover:bg-red-50" 
                      variant="outline"
                    >
                      Cancel Order
                    </Button>
                  )}

                  <Button 
                    className="w-full"
                    onClick={() => router.push("/help-support")}
                    variant="outline"
                  >
                    Need Help?
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
