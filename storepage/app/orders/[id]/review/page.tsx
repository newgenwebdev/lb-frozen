"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import ProfileSidebar from "@/components/layout/ProfileSidebar";
import { createReview } from "@/lib/api/reviews";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Star, Package, Check } from "lucide-react";
import Link from "next/link";
import type { LineItem } from "@/lib/api/types";
import MediaUploader, { type MediaUploaderRef } from "@/components/shared/MediaUploader";
import { useOrderQuery, useProductReviewStatusQuery } from "@/lib/queries";

// Star rating component
function StarRating({
  rating,
  onChange,
  size = "lg",
}: {
  rating: number;
  onChange: (rating: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClass =
    size === "lg" ? "w-8 h-8" : size === "md" ? "w-6 h-6" : "w-5 h-5";

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className="cursor-pointer transition-transform hover:scale-110"
        >
          <Star
            className={`${sizeClass} ${
              star <= (hoverRating || rating)
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

interface ReviewFormData {
  rating: number;
  title: string;
  content: string;
  imageUrls: string[];
}

// Helper to get product_id from line item
// API returns product_id directly on item, or through variant.product_id
function getProductId(item: any): string {
  // First check direct product_id (from customer-orders API)
  if (item.product_id) {
    return item.product_id;
  }
  // Fallback to variant.product_id (from cart API)
  if (item.variant?.product_id) {
    return item.variant.product_id;
  }
  return "";
}

export default function OrderReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const orderId = params.id as string;

  // Use React Query for order fetching
  const { data: order, isLoading: loading, error: queryError } = useOrderQuery(orderId);
  const error = queryError ? "Failed to load order" : null;

  // Track review status for each product
  const [reviewedProducts, setReviewedProducts] = useState<Set<string>>(
    new Set()
  );
  const [reviewForms, setReviewForms] = useState<
    Record<string, ReviewFormData>
  >({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<Set<string>>(new Set());
  const [checkingReviews, setCheckingReviews] = useState(false);
  
  // Refs for MediaUploader components (upload on submit)
  const mediaUploaderRefs = useRef<Record<string, MediaUploaderRef | null>>({});

  // Initialize review forms when order loads
  useEffect(() => {
    if (!order?.items) return;
    
    const initializeForms = () => {
      // Initialize review forms for each product
      const forms: Record<string, ReviewFormData> = {};
      for (const item of order.items || []) {
        const productId = getProductId(item);
        if (productId) {
          forms[productId] = {
            rating: 5,
            title: "",
            content: "",
            imageUrls: [],
          };
        }
      }
      setReviewForms(forms);
    };
    
    initializeForms();
  }, [order]);
  
  // Check review status for products (using queries in render)
  // Note: This could be optimized with a bulk API endpoint in the future
  const productIds = order?.items?.map(item => getProductId(item)).filter(Boolean) as string[] || [];
  
  // Use React Query to check each product's review status
  // This will be cached and won't refetch unnecessarily
  const reviewStatuses = productIds.map(productId => 
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useProductReviewStatusQuery(productId)
  );
  
  // Update reviewed products when queries complete
  useEffect(() => {
    if (reviewStatuses.every(q => !q.isLoading)) {
      const reviewed = new Set<string>();
      reviewStatuses.forEach((query, index) => {
        if (query.data?.has_reviewed) {
          reviewed.add(productIds[index]);
        }
      });
      setReviewedProducts(reviewed);
    }
  }, [reviewStatuses.map(q => q.isLoading).join(','), reviewStatuses.map(q => q.data?.has_reviewed).join(',')]);

  // Update form data
  const updateForm = (
    productId: string,
    field: keyof ReviewFormData,
    value: string | number | string[]
  ) => {
    setReviewForms((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  };

  // Submit review
  const handleSubmitReview = async (productId: string) => {
    const form = reviewForms[productId];
    if (!form || form.rating === 0) {
      showToast("Please select a rating", "warning");
      return;
    }

    setSubmitting(productId);
    try {
      // Upload photos first if any
      let imageUrls: string[] = [];
      const uploaderRef = mediaUploaderRefs.current[productId];
      if (uploaderRef?.hasFiles()) {
        try {
          imageUrls = await uploaderRef.uploadAll();
        } catch (uploadError: any) {
          showToast(uploadError.message || "Failed to upload photos", "error");
          setSubmitting(null);
          return;
        }
      }

      await createReview({
        product_id: productId,
        order_id: orderId,
        rating: form.rating,
        title: form.title || undefined,
        content: form.content || undefined,
        images: imageUrls.length > 0 ? imageUrls : undefined,
      });

      setSubmitSuccess((prev) => new Set([...prev, productId]));
      setReviewedProducts((prev) => new Set([...prev, productId]));
      showToast("Review submitted successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to submit review", "error");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-center min-h-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#23429B] mx-auto mb-4"></div>
            <p className="text-gray-500">Loading order...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || "Order not found"}</p>
          <Link href="/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if order can be reviewed (completed, delivered, or shipped)
  const canReview = ["delivered", "completed", "shipped", "fulfilled"].includes(
    order.fulfillment_status || ""
  );
  if (!canReview) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">
            You can only review products from completed orders.
            <br />
            <span className="text-sm text-gray-400">
              Current status: {order.fulfillment_status || "unknown"}
            </span>
          </p>
          <Link href="/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if order has items
  if (!order.items || order.items.length === 0) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No items found in this order.</p>
          <Link href="/orders">
            <Button>Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const allReviewed = order.items?.every((item: LineItem) => {
    const productId = getProductId(item);
    return productId && reviewedProducts.has(productId);
  });

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block lg:w-64 shrink-0">
            <ProfileSidebar activeMenu="My orders" />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <Link
                    href="/orders"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      Review Products
                    </h1>
                    <p className="text-sm text-gray-500">
                      Order #{order.display_id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Products to Review */}
              <div className="p-4 sm:p-6 space-y-6">
                {allReviewed ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      All Reviews Submitted!
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Thank you for reviewing your products.
                    </p>
                    <Link href="/orders">
                      <Button>Back to Orders</Button>
                    </Link>
                  </div>
                ) : (
                  order.items?.map((item: LineItem) => {
                    const productId = getProductId(item);
                    if (!productId) return null;

                    const isReviewed = reviewedProducts.has(productId);
                    const isSuccess = submitSuccess.has(productId);
                    const isSubmitting = submitting === productId;
                    const form = reviewForms[productId] || {
                      rating: 5,
                      title: "",
                      content: "",
                      imageUrls: [],
                    };

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-xl p-4 sm:p-5 ${
                          isReviewed || isSuccess
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200"
                        }`}
                      >
                        {/* Product Info */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                            {item.thumbnail ? (
                              <Image
                                src={item.thumbnail}
                                alt={item.title}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {item.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          {(isReviewed || isSuccess) && (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                              <Check className="w-4 h-4" />
                              Reviewed
                            </div>
                          )}
                        </div>

                        {/* Review Form */}
                        {!isReviewed && !isSuccess && (
                          <div className="space-y-4">
                            {/* Rating */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Rating
                              </label>
                              <StarRating
                                rating={form.rating}
                                onChange={(rating) =>
                                  updateForm(productId, "rating", rating)
                                }
                              />
                            </div>

                            {/* Title */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Review Title (optional)
                              </label>
                              <input
                                type="text"
                                value={form.title}
                                onChange={(e) =>
                                  updateForm(productId, "title", e.target.value)
                                }
                                placeholder="Summarize your experience"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                maxLength={200}
                              />
                            </div>
                            {/* Content */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Review (optional)
                              </label>
                              <textarea
                                value={form.content}
                                onChange={(e) =>
                                  updateForm(
                                    productId,
                                    "content",
                                    e.target.value
                                  )
                                }
                                placeholder="Share your thoughts about this product..."
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                maxLength={5000}
                              />
                            </div>

                            {/* Media Upload */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Photos (optional)
                              </label>
                              <MediaUploader
                                ref={(el: MediaUploaderRef | null) => {
                                  mediaUploaderRefs.current[productId] = el;
                                }}
                                maxFiles={5}
                                maxSizeMB={10}
                              />
                            </div>

                            {/* Submit */}
                            <Button
                              onClick={() => handleSubmitReview(productId)}
                              disabled={isSubmitting}
                              className="text-white cursor-pointer rounded-full"
                              style={{
                                background:
                                  "linear-gradient(to right, #23429B, #C52129)",
                              }}
                            >
                              {isSubmitting ? "Submitting..." : "Submit Review"}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
