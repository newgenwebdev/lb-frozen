"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import {
  getProductReviews,
  getMyProductReview,
  deleteReview,
  markReviewHelpful,
} from "@/lib/api/reviews";
import type { Review, ReviewStats } from "@/lib/api/reviews";
import ImageLightbox from "./ImageLightbox";
import { Play } from "lucide-react";
import { useProductReviewsQuery, useProductReviewStatusQuery } from "@/lib/queries";

interface ProductReviewsProps {
  productId: string;
  isAuthenticated: boolean;
  customerName?: string;
}

// Helper to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Get initials from name
function getInitials(name: string): string {
  if (!name) return "??";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Star rating component
function StarRating({
  rating,
  size = "sm",
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClass = size === "lg" ? "w-6 h-6" : size === "md" ? "w-5 h-5" : "w-4 h-4";

  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <svg
            className={`${sizeClass} ${
              star <= (hoverRating || rating)
                ? "text-yellow-400 fill-current"
                : "text-gray-300 fill-current"
            }`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

// Note: Review form has been moved to /orders/[id]/review page
// Reviews can only be submitted for completed orders

// Single review card
function ReviewCard({
  review,
  isOwn,
  onDelete,
  onHelpful,
  showToast,
}: {
  review: Review;
  isOwn: boolean;
  onDelete?: () => void;
  onHelpful?: () => void;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    setDeleting(true);
    try {
      await deleteReview(review.id);
      onDelete?.();
    } catch (err) {
      showToast("Failed to delete review", "error");
    } finally {
      setDeleting(false);
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  // Get display name for reviewer
  const displayName = review.customer_name || "Customer";

  // Handle both formats: { items: [...] } and legacy { items: { items: [...] } }
  const getMediaUrls = (): string[] => {
    if (!review.images?.items) return [];
    if (Array.isArray(review.images.items)) {
      return review.images.items;
    }
    if (typeof review.images.items === 'object' && 'items' in review.images.items && Array.isArray(review.images.items.items)) {
      return review.images.items.items;
    }
    return [];
  };
  const mediaUrls = getMediaUrls();

  // Helper to check if URL is a video
  const isVideo = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  };

  return (
    <div className="flex gap-3 lg:gap-4 pb-4 lg:pb-6 border-b border-gray-100">
      {/* Avatar - show image if available, otherwise initials */}
      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gray-100 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
        {review.customer_avatar ? (
          <Image
            src={review.customer_avatar}
            alt={displayName}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs lg:text-sm font-semibold text-gray-600">
            {getInitials(displayName)}
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="font-semibold text-gray-900 flex items-center gap-2">
              {displayName}
              {review.is_verified_purchase && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Verified Purchase
                </span>
              )}
              {isOwn && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Your Review
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={review.rating} />
              <span className="text-sm text-gray-900 font-semibold">
                {review.rating.toFixed(1)}
              </span>
            </div>
          </div>
          <span className="text-xs lg:text-sm text-gray-500">
            {formatDate(review.created_at)}
          </span>
        </div>

        {review.title && (
          <h5 className="font-medium text-gray-900 mb-1">{review.title}</h5>
        )}

        {review.content && (
          <p className="text-xs lg:text-sm text-gray-700 leading-relaxed mb-2 lg:mb-3">
            &quot;{review.content}&quot;
          </p>
        )}

        {mediaUrls.length > 0 && (
          <div className="flex gap-2 mb-2 lg:mb-3 flex-wrap">
            {mediaUrls.slice(0, 4).map((url, idx) => (
              <button
                key={idx}
                onClick={() => openLightbox(idx)}
                className="relative w-16 h-16 lg:w-20 lg:h-20 bg-gray-100 rounded-lg overflow-hidden hover:opacity-80 transition cursor-pointer"
              >
                {isVideo(url) ? (
                  <>
                    <video
                      src={url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                    {/* Play icon overlay for videos */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </>
                ) : (
                  <img
                    src={url}
                    alt={`Review photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Show "+X" overlay if more than 4 items */}
                {idx === 3 && mediaUrls.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold">
                    +{mediaUrls.length - 4}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {lightboxOpen && mediaUrls.length > 0 && (
          <ImageLightbox
            images={mediaUrls}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
          />
        )}

        <div className="flex items-center gap-4 text-xs lg:text-sm text-gray-600">
          {!isOwn && (
            <button
              onClick={onHelpful}
              className="flex items-center gap-1 hover:text-gray-900"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                />
              </svg>
              Helpful ({review.helpful_count})
            </button>
          )}
          {isOwn && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProductReviews({
  productId,
  isAuthenticated,
  customerName,
}: ProductReviewsProps) {
  const { showToast } = useToast();
  
  // React Query for reviews
  const { data: reviewsData, isLoading: loading, refetch: refetchReviews } = useProductReviewsQuery(productId);
  const reviews = reviewsData?.reviews || [];
  const stats = reviewsData?.stats || null;
  
  // React Query for user's review status
  const { data: myReviewData } = useProductReviewStatusQuery(isAuthenticated ? productId : null);
  const myReview = myReviewData?.review || null;
  
  const [sortBy, setSortBy] = useState<"recent" | "helpful" | "high" | "low">("recent");
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // Handle helpful click
  const handleHelpful = async (reviewId: string) => {
    if (!isAuthenticated) {
      showToast("Please log in to mark reviews as helpful", "info");
      return;
    }
    try {
      await markReviewHelpful(reviewId);
      refetchReviews();
    } catch (err) {
      console.error("Failed to mark helpful:", err);
    }
  };

  // Filter and sort reviews
  const displayedReviews = reviews
    .filter((r) => !filterRating || r.rating === filterRating)
    .sort((a, b) => {
      switch (sortBy) {
        case "helpful":
          return b.helpful_count - a.helpful_count;
        case "high":
          return b.rating - a.rating;
        case "low":
          return a.rating - b.rating;
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Calculate rating bar widths
  const getRatingWidth = (stars: number) => {
    if (!stats || stats.total_reviews === 0) return "0%";
    const count = stats.rating_breakdown[stars as keyof typeof stats.rating_breakdown] || 0;
    return `${(count / stats.total_reviews) * 100}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6 lg:space-y-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="flex gap-12">
          <div className="w-32 h-32 bg-gray-200 rounded-xl"></div>
          <div className="flex-1 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Reviews Overview */}
      <div>
        <h3 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6">
          Reviews overview
        </h3>
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
          {/* Rating Summary */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 lg:w-16 lg:h-16 bg-yellow-400 rounded-xl flex items-center justify-center mb-2 lg:mb-3">
              <svg
                className="w-8 h-8 lg:w-10 lg:h-10 text-white fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900">
              {(stats?.average_rating || 0).toFixed(1)} of 5.0
            </div>
            <div className="text-xs lg:text-sm text-gray-600 mt-1">
              {(stats?.total_reviews || 0).toLocaleString()} reviews
            </div>
          </div>

          {/* Rating Bars */}
          <div className="flex-1 space-y-1.5 lg:space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => (
              <button
                key={stars}
                onClick={() => setFilterRating(filterRating === stars ? null : stars)}
                className={`flex items-center gap-3 w-full ${
                  filterRating === stars ? "opacity-100" : "opacity-70 hover:opacity-100"
                }`}
              >
                <span className="text-sm text-gray-900 w-6">{stars}.0</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#23429B] rounded-full transition-all"
                    style={{ width: getRatingWidth(stars) }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {stats?.rating_breakdown[stars as keyof typeof stats.rating_breakdown] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Write Review Info */}
      {isAuthenticated ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            {myReview ? (
              <>
                You have already reviewed this product.{" "}
                <Link href="/orders" className="font-medium underline hover:text-blue-900">
                  View your orders
                </Link>{" "}
                to manage your reviews.
              </>
            ) : (
              <>
                To write a review, you need to have purchased this product.{" "}
                <Link href="/orders" className="font-medium underline hover:text-blue-900">
                  Go to My Orders
                </Link>{" "}
                to review products from your completed orders.
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          <Link href="/otp" className="text-blue-600 hover:underline">
            Log in
          </Link>{" "}
          to write a review. Reviews can only be submitted for products you have purchased.
        </p>
      )}

      {/* All Reviews */}
      <div>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-0 mb-4 lg:mb-6">
          <h3 className="text-lg lg:text-xl font-semibold">
            All reviews ({displayedReviews.length})
            {filterRating && (
              <button
                onClick={() => setFilterRating(null)}
                className="ml-2 text-sm text-blue-600 font-normal"
              >
                Clear filter
              </button>
            )}
          </h3>
          <div className="flex gap-2 lg:gap-4 overflow-x-auto">
            <select
              value={filterRating || ""}
              onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
              className="px-3 lg:px-4 py-2 border border-gray-200 rounded-lg text-xs lg:text-sm"
            >
              <option value="">All ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 lg:px-4 py-2 border border-gray-200 rounded-lg text-xs lg:text-sm"
            >
              <option value="recent">Most recent</option>
              <option value="helpful">Most helpful</option>
              <option value="high">Highest rating</option>
              <option value="low">Lowest rating</option>
            </select>
          </div>
        </div>

        {/* Review Items */}
        <div className="space-y-4 lg:space-y-6">
          {displayedReviews.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {filterRating
                ? `No ${filterRating}-star reviews yet`
                : "No reviews yet. Be the first to review this product!"}
            </p>
          ) : (
            displayedReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isOwn={review.id === myReview?.id}
                onDelete={() => {
                  refetchReviews();
                }}
                onHelpful={() => handleHelpful(review.id)}
                showToast={showToast}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductReviews;
