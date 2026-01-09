"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  FormInput,
  FormNumberInput,
  FormCurrencyInput,
  FormDropdown,
  FormSection,
  FormDateInput,
} from "@/components/admin/membership";
import { useCreateMembershipPromo } from "@/lib/api/mutations";
import { useToast } from "@/contexts/ToastContext";
import type {
  CreateMembershipPromoInput,
  MembershipPromoDiscountType,
  MembershipPromoStatus,
} from "@/lib/types/membership";

type FormData = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: MembershipPromoStatus;
  discount_type: MembershipPromoDiscountType;
  discount_value: number;
  minimum_purchase: number;
};

export default function AddMembershipPromoPage(): React.JSX.Element {
  const router = useRouter();
  const createPromoMutation = useCreateMembershipPromo();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    status: "active",
    discount_type: "percentage",
    discount_value: 0,
    minimum_purchase: 0,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );

  const handleInputChange = (
    field: keyof FormData,
    value: string | number
  ): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    }

    if (!formData.end_date) {
      newErrors.end_date = "End date is required";
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end <= start) {
        newErrors.end_date = "End date must be after start date";
      }
    }

    if (formData.discount_value < 0) {
      newErrors.discount_value = "Discount value must be positive";
    }

    if (
      formData.discount_type === "percentage" &&
      formData.discount_value > 100
    ) {
      newErrors.discount_value = "Percentage cannot exceed 100%";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Convert dollar amounts to cents for fixed discount type
    const discountValueInCents =
      formData.discount_type === "fixed"
        ? Math.round(formData.discount_value * 100)
        : formData.discount_value;

    // Convert minimum purchase to cents (always in cents)
    const minimumPurchaseInCents =
      formData.minimum_purchase > 0
        ? Math.round(formData.minimum_purchase * 100)
        : undefined;

    const input: CreateMembershipPromoInput = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      start_date: formData.start_date,
      end_date: formData.end_date,
      status: formData.status,
      discount_type: formData.discount_type,
      discount_value: discountValueInCents,
      minimum_purchase: minimumPurchaseInCents,
    };

    createPromoMutation.mutate(input, {
      onSuccess: () => {
        router.push("/admin/membership/promos");
      },
      onError: (error) => {
        console.error("Failed to create promo:", error);
        showToast("Failed to create promo. Please try again.", "error");
      },
    });
  };

  const handleCancel = (): void => {
    router.push("/admin/membership");
  };

  // Map discount type to display string
  const discountTypeOptions = ["Percentage (%)", "Fixed Amount"];
  const getDiscountTypeDisplay = (
    type: MembershipPromoDiscountType
  ): string => {
    return type === "percentage" ? "Percentage (%)" : "Fixed Amount";
  };
  const getDiscountTypeValue = (
    display: string
  ): MembershipPromoDiscountType => {
    return display === "Percentage (%)" ? "percentage" : "fixed";
  };

  // Map status to display string
  const statusOptions = ["Active", "Non Active"];
  const getStatusDisplay = (status: MembershipPromoStatus): string => {
    return status === "active" ? "Active" : "Non Active";
  };
  const getStatusValue = (display: string): MembershipPromoStatus => {
    return display === "Active" ? "active" : "non-active";
  };

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Add Membership Promo
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={createPromoMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={createPromoMutation.isPending}
          >
            {createPromoMutation.isPending ? "Creating..." : "Create Promo"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Basic Information */}
            <FormSection title="Basic Information">
              <FormInput
                label="Promo Name"
                placeholder="e.g. Holiday Special 2025"
                value={formData.name}
                onChange={(value) => handleInputChange("name", value)}
                error={errors.name}
              />
              <FormInput
                label="Description (Optional)"
                placeholder="Optional description for this promo"
                value={formData.description}
                onChange={(value) => handleInputChange("description", value)}
              />
            </FormSection>

            {/* Promo Period & Status */}
            <FormSection title="Promo Period & Status">
              <div className="grid grid-cols-2 gap-4">
                <FormDateInput
                  label="Start Date"
                  value={formData.start_date}
                  onChange={(value) => handleInputChange("start_date", value)}
                  error={errors.start_date}
                />
                <FormDateInput
                  label="End Date"
                  value={formData.end_date}
                  onChange={(value) => handleInputChange("end_date", value)}
                  error={errors.end_date}
                />
              </div>
              <FormDropdown
                label="Status"
                value={getStatusDisplay(formData.status)}
                onChange={(value) =>
                  handleInputChange("status", getStatusValue(value))
                }
                options={statusOptions}
              />
            </FormSection>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Discount Settings */}
            <FormSection title="Discount Settings">
              <div className="grid grid-cols-2 gap-4">
                <FormDropdown
                  label="Discount Type"
                  value={getDiscountTypeDisplay(formData.discount_type)}
                  onChange={(value) =>
                    handleInputChange(
                      "discount_type",
                      getDiscountTypeValue(value)
                    )
                  }
                  options={discountTypeOptions}
                />
                {formData.discount_type === "percentage" ? (
                  <FormNumberInput
                    label="Discount Value (%)"
                    value={formData.discount_value}
                    onChange={(value) =>
                      handleInputChange("discount_value", value)
                    }
                    min={0}
                    max={100}
                    step={1}
                    error={errors.discount_value}
                  />
                ) : (
                  <FormCurrencyInput
                    label="Discount Value"
                    value={formData.discount_value}
                    onChange={(value) =>
                      handleInputChange("discount_value", value)
                    }
                    min={0}
                    error={errors.discount_value}
                  />
                )}
              </div>
              <FormCurrencyInput
                label="Minimum Purchase (Optional)"
                value={formData.minimum_purchase}
                onChange={(value) =>
                  handleInputChange("minimum_purchase", value)
                }
                min={0}
              />
              <p className="font-public text-[12px] text-[#6A7282]">
                Leave empty for no minimum purchase requirement.
              </p>
            </FormSection>
          </div>
        </div>
      </form>
    </div>
  );
}
