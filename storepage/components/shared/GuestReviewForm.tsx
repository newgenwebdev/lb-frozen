"use client";

import { useState, useRef } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { createGuestReview } from "@/lib/api/reviews";
import MediaUploader, { MediaUploaderRef } from "./MediaUploader";

interface GuestReviewFormProps {
  productId: string;
  productName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function GuestReviewForm({
  productId,
  productName,
  onSuccess,
  onCancel,
}: GuestReviewFormProps) {
  const { showToast } = useToast();
  const mediaUploaderRef = useRef<MediaUploaderRef>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [formData, setFormData] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    title: "",
    content: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (rating === 0) {
      newErrors.rating = "Please select a rating";
    }
    if (!formData.guest_name.trim()) {
      newErrors.guest_name = "Name is required";
    }
    if (!formData.guest_email.trim()) {
      newErrors.guest_email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guest_email)) {
      newErrors.guest_email = "Please enter a valid email";
    }
    if (!formData.content.trim()) {
      newErrors.content = "Review content is required";
    } else if (formData.content.trim().length < 10) {
      newErrors.content = "Review must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first if any
      let imageUrls: string[] = [];
      if (mediaUploaderRef.current?.hasFiles()) {
        try {
          imageUrls = await mediaUploaderRef.current.uploadAll();
        } catch (uploadError) {
          showToast("Failed to upload images. Please try again.", "error");
          setIsSubmitting(false);
          return;
        }
      }

      await createGuestReview({
        product_id: productId,
        guest_name: formData.guest_name.trim(),
        guest_email: formData.guest_email.trim(),
        guest_phone: formData.guest_phone.trim() || undefined,
        rating,
        title: formData.title.trim() || undefined,
        content: formData.content.trim(),
        images: imageUrls.length > 0 ? imageUrls : undefined,
      });

      showToast(
        "Thank you for your review! It will be visible after moderation.",
        "success"
      );
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to submit review. Please try again.";
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Write a Review for
        </h3>
        <p className="text-gray-600">{productName}</p>
      </div>

      {/* Star Rating */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Rating <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setRating(star);
                if (errors.rating) {
                  setErrors((prev) => ({ ...prev, rating: "" }));
                }
              }}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${
                  star <= (hoveredRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
        {errors.rating && (
          <p className="text-xs text-red-500">{errors.rating}</p>
        )}
      </div>

      {/* Guest Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="guest_name" className="text-sm font-medium">
            Your Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="guest_name"
            name="guest_name"
            placeholder="John Doe"
            value={formData.guest_name}
            onChange={handleInputChange}
            className={errors.guest_name ? "border-red-500" : ""}
          />
          {errors.guest_name && (
            <p className="text-xs text-red-500">{errors.guest_name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="guest_email" className="text-sm font-medium">
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id="guest_email"
            name="guest_email"
            type="email"
            placeholder="john@example.com"
            value={formData.guest_email}
            onChange={handleInputChange}
            className={errors.guest_email ? "border-red-500" : ""}
          />
          {errors.guest_email && (
            <p className="text-xs text-red-500">{errors.guest_email}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest_phone" className="text-sm font-medium">
          Phone Number (Optional)
        </Label>
        <Input
          id="guest_phone"
          name="guest_phone"
          placeholder="+60 12-345 6789"
          value={formData.guest_phone}
          onChange={handleInputChange}
        />
      </div>

      {/* Review Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Review Title (Optional)
        </Label>
        <Input
          id="title"
          name="title"
          placeholder="Summarize your experience"
          value={formData.title}
          onChange={handleInputChange}
          maxLength={200}
        />
      </div>

      {/* Review Content */}
      <div className="space-y-2">
        <Label htmlFor="content" className="text-sm font-medium">
          Your Review <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="content"
          name="content"
          placeholder="Tell us about your experience with this product..."
          value={formData.content}
          onChange={handleInputChange}
          rows={4}
          maxLength={5000}
          className={errors.content ? "border-red-500" : ""}
        />
        <div className="flex justify-between text-xs text-gray-500">
          {errors.content ? (
            <p className="text-red-500">{errors.content}</p>
          ) : (
            <span>Minimum 10 characters</span>
          )}
          <span>{formData.content.length}/5000</span>
        </div>
      </div>

      {/* Photo Upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Photos (Optional)</Label>
        <MediaUploader ref={mediaUploaderRef} maxFiles={4} maxSizeMB={5} />
      </div>

      {/* Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Your review will be visible after our team
          reviews it. This usually takes 1-2 business days.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-gradient-to-b from-[#23429B] to-[#C52129] text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Review"
          )}
        </Button>
      </div>
    </form>
  );
}
