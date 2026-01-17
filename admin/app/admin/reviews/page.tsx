"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  Check,
  X,
  Trash2,
  Eye,
  Filter,
  User,
  Mail,
  Phone,
  ShoppingBag,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  getAdminReviews,
  approveReview,
  rejectReview,
  deleteAdminReview,
  type AdminReview,
} from "@/lib/api/reviews";
import { useToast } from "@/contexts/ToastContext";
import Image from "next/image";

type FilterTab = "all" | "pending" | "approved" | "guest";

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null);

  const getFilters = () => {
    switch (activeTab) {
      case "pending":
        return { is_approved: false };
      case "approved":
        return { is_approved: true };
      case "guest":
        return { is_guest_review: true };
      default:
        return {};
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-reviews", activeTab],
    queryFn: () => getAdminReviews({ ...getFilters(), limit: 50 }),
  });

  // Always fetch pending count for badge
  const { data: pendingData } = useQuery({
    queryKey: ["admin-reviews", "pending-count"],
    queryFn: () => getAdminReviews({ is_approved: false, limit: 1 }),
  });

  const approveMutation = useMutation({
    mutationFn: approveReview,
    onSuccess: () => {
      showToast("Review approved", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => {
      showToast("Failed to approve review", "error");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectReview,
    onSuccess: () => {
      showToast("Review rejected", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: () => {
      showToast("Failed to reject review", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminReview,
    onSuccess: () => {
      showToast("Review deleted", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setSelectedReview(null);
    },
    onError: () => {
      showToast("Failed to delete review", "error");
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-MY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getReviewerName = (review: AdminReview) => {
    if (review.is_guest_review && review.guest_name) {
      return review.guest_name;
    }
    if (review.customer) {
      return `${review.customer.first_name} ${review.customer.last_name}`.trim();
    }
    return "Unknown";
  };

  const getReviewerEmail = (review: AdminReview) => {
    if (review.is_guest_review && review.guest_email) {
      return review.guest_email;
    }
    return review.customer?.email || null;
  };

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "pending", label: "Pending Approval" },
    { key: "approved", label: "Approved" },
    { key: "guest", label: "Guest Reviews" },
    { key: "all", label: "All Reviews" },
  ];

  if (error) {
    return (
      <div className="px-4 md:px-8 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700">Failed to load reviews. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review Management</h1>
        <p className="text-gray-600 mt-1">
          Manage and moderate customer reviews
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.key === "pending" && pendingData?.count !== undefined && pendingData.count > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                {pendingData.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : !data?.reviews?.length ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No reviews found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.reviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
                !review.is_approved ? "border-yellow-300 bg-yellow-50/30" : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {getReviewerName(review)}
                      </span>
                      {review.is_guest_review && (
                        <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-600 rounded">
                          Guest
                        </span>
                      )}
                      {review.is_verified_purchase && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {renderStars(review.rating)}
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      {formatDate(review.created_at)}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {review.is_approved ? (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                      Approved
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Info for Guest */}
              {review.is_guest_review && (
                <div className="flex gap-4 text-sm text-gray-500 mb-3">
                  {review.guest_email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {review.guest_email}
                    </span>
                  )}
                  {review.guest_phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {review.guest_phone}
                    </span>
                  )}
                </div>
              )}

              {/* Product */}
              {review.product && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 rounded">
                  {review.product.thumbnail && (
                    <Image
                      src={review.product.thumbnail}
                      alt={review.product.title}
                      width={40}
                      height={40}
                      className="rounded object-cover"
                    />
                  )}
                  <span className="text-sm text-gray-700 font-medium">
                    {review.product.title}
                  </span>
                </div>
              )}

              {/* Review Content */}
              {review.title && (
                <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
              )}
              {review.content && (
                <p className="text-gray-600 text-sm line-clamp-3">{review.content}</p>
              )}

              {/* Images */}
              {review.images?.items?.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {review.images.items.slice(0, 3).map((url, idx) => (
                    <Image
                      key={idx}
                      src={typeof url === 'string' ? url : ''}
                      alt={`Review image ${idx + 1}`}
                      width={60}
                      height={60}
                      className="rounded object-cover"
                    />
                  ))}
                  {review.images.items.length > 3 && (
                    <span className="w-15 h-15 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                      +{review.images.items.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t">
                {!review.is_approved && (
                  <button
                    onClick={() => approveMutation.mutate(review.id)}
                    disabled={approveMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                )}
                {review.is_approved && (
                  <button
                    onClick={() => rejectMutation.mutate(review.id)}
                    disabled={rejectMutation.isPending}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this review?")) {
                      deleteMutation.mutate(review.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
