import React from "react";

// Order statuses from server: pending, paid, processing, shipped, delivered, cancelled, refunded, partially_refunded
type OrderStatus =
  | "Pending"
  | "Paid"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Refunded"
  | "Partially_refunded"
  | "Failed"; // Legacy support

type StatusIconProps = {
  status: OrderStatus;
  size?: number;
};

export function StatusIcon({ status, size = 16 }: StatusIconProps): React.JSX.Element | null {
  switch (status) {
    // Completed states (green checkmark)
    case "Delivered":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" fill="#049228" />
          <path d="M5.5 8L7 9.5L10.5 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Paid - money received (green dollar)
    case "Paid":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" fill="#059669" />
          <path d="M8 4.5v7M9.5 6c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5.67 1.5 1.5 1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Shipped - in transit (blue truck)
    case "Shipped":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" fill="#2563EB" />
          <path d="M4 8.5h5M9 8.5v-2h2l1.5 2v2h-1M5.5 10.5a1 1 0 100-2 1 1 0 000 2zM10.5 10.5a1 1 0 100-2 1 1 0 000 2z" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Processing - being prepared (blue gear)
    case "Processing":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" fill="#3B82F6" />
          <path d="M8 5.5v1M8 9.5v1M5.5 8h1M9.5 8h1M6.2 6.2l.7.7M9.1 9.1l.7.7M9.1 6.2l-.7.7M6.2 9.8l.7-.7" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Pending - waiting (yellow clock)
    case "Pending":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" fill="#F59E0B" />
          <path d="M8 5v3l2 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Cancelled/Failed - not happening (red X)
    case "Cancelled":
    case "Failed":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" fill="#DC2626" />
          <path d="M10 6L6 10M6 6l4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Refunded - money returned (purple arrow)
    case "Refunded":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" fill="#7C3AED" />
          <path d="M5 8h6M5 8l2-2M5 8l2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    // Partially refunded - some money returned (purple partial)
    case "Partially_refunded":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" fill="#8B5CF6" />
          <path d="M5.5 8h3M5.5 8l1.5-1.5M5.5 8l1.5 1.5M10.5 6v4" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    default:
      return null;
  }
}
