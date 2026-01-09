"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PromoFormInput,
  PromoFormDropdown,
  PromoFormDateInput,
  PromoFormSection,
  PromoFormProductSelector,
} from "@/components/admin/promo";
import { useCreateCoupon, useCreatePWPRule } from "@/lib/api/mutations";
import { useToast } from "@/contexts/ToastContext";
import type { PromoType, TriggerType } from "@/lib/types/promo";

type CouponFormData = {
  name: string;
  code: string;
  type: PromoType;
  value: string;
  startDate: string;
  endDate: string;
};

type PWPFormData = {
  name: string;
  rule_description: string;
  trigger_type: TriggerType;
  trigger_product_id: string;
  trigger_cart_value: string;
  reward_product_id: string;
  reward_type: PromoType;
  reward_value: string;
  startDate: string;
  endDate: string;
};

// Grid icon for category/name inputs
function GridIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <rect
        x="2"
        y="2"
        width="5"
        height="5"
        rx="1"
        stroke="#6A7282"
        strokeWidth="1.25"
      />
      <rect
        x="9"
        y="2"
        width="5"
        height="5"
        rx="1"
        stroke="#6A7282"
        strokeWidth="1.25"
      />
      <rect
        x="2"
        y="9"
        width="5"
        height="5"
        rx="1"
        stroke="#6A7282"
        strokeWidth="1.25"
      />
      <rect
        x="9"
        y="9"
        width="5"
        height="5"
        rx="1"
        stroke="#6A7282"
        strokeWidth="1.25"
      />
    </svg>
  );
}

// Cart icon
function CartIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M1 1H3L3.4 3M3.4 3H15L12 9H4.4M3.4 3L4.4 9M4.4 9L2.7 11H12"
        stroke="#6A7282"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="14" r="1" stroke="#6A7282" strokeWidth="1.25" />
      <circle cx="11" cy="14" r="1" stroke="#6A7282" strokeWidth="1.25" />
    </svg>
  );
}

function AddPromoPageContent(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const promoType = searchParams.get("type") || "coupon";
  const isCoupon = promoType === "coupon";

  // Coupon form state
  const [couponForm, setCouponForm] = useState<CouponFormData>({
    name: "",
    code: "",
    type: "percentage",
    value: "",
    startDate: "",
    endDate: "",
  });

  // PWP form state
  const [pwpForm, setPWPForm] = useState<PWPFormData>({
    name: "",
    rule_description: "",
    trigger_type: "product",
    trigger_product_id: "",
    trigger_cart_value: "",
    reward_product_id: "",
    reward_type: "percentage",
    reward_value: "",
    startDate: "",
    endDate: "",
  });

  // Mutations
  const createCouponMutation = useCreateCoupon();
  const createPWPRuleMutation = useCreatePWPRule();

  const isSubmitting = createCouponMutation.isPending || createPWPRuleMutation.isPending;

  const handleCouponChange = (
    field: keyof CouponFormData,
    value: string
  ): void => {
    setCouponForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePWPChange = (
    field: keyof PWPFormData,
    value: string
  ): void => {
    setPWPForm((prev) => {
      const updates: Partial<PWPFormData> = { [field]: value };

      // Clear the opposite trigger field when trigger_type changes
      if (field === "trigger_type") {
        if (value === "cart_value") {
          updates.trigger_product_id = "";
        } else if (value === "product") {
          updates.trigger_cart_value = "";
        }
      }

      return { ...prev, ...updates };
    });
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      if (isCoupon) {
        // Validate coupon form
        if (!couponForm.name || !couponForm.code) {
          showToast("Please fill in all required fields (Name and Code)", "warning");
          return;
        }

        // Convert dollar amounts to cents for fixed discount
        const couponValueCents = couponForm.type === "fixed" && couponForm.value
          ? Math.round(parseFloat(couponForm.value) * 100)
          : (couponForm.value ? parseFloat(couponForm.value) : 0);

        await createCouponMutation.mutateAsync({
          name: couponForm.name,
          code: couponForm.code.toUpperCase(),
          type: couponForm.type,
          value: couponValueCents,
          status: "active",
          starts_at: couponForm.startDate ? new Date(couponForm.startDate).toISOString() : null,
          ends_at: couponForm.endDate ? new Date(couponForm.endDate).toISOString() : null,
        });
        showToast("Coupon created successfully", "success");
      } else {
        // Validate PWP form
        if (!pwpForm.name || !pwpForm.rule_description) {
          showToast("Please fill in all required fields (Name and Rule Description)", "warning");
          return;
        }

        // Convert dollar amounts to cents for cart value and fixed reward
        // Only use the relevant trigger field based on trigger_type
        const triggerCartValueCents = pwpForm.trigger_type === "cart_value" && pwpForm.trigger_cart_value
          ? Math.round(parseFloat(pwpForm.trigger_cart_value) * 100)
          : null;
        const triggerProductId = pwpForm.trigger_type === "product" && pwpForm.trigger_product_id
          ? pwpForm.trigger_product_id
          : null;
        const rewardValueCents = pwpForm.reward_type === "fixed" && pwpForm.reward_value
          ? Math.round(parseFloat(pwpForm.reward_value) * 100)
          : (pwpForm.reward_value ? parseFloat(pwpForm.reward_value) : 0);

        await createPWPRuleMutation.mutateAsync({
          name: pwpForm.name,
          rule_description: pwpForm.rule_description,
          trigger_type: pwpForm.trigger_type,
          trigger_product_id: triggerProductId,
          trigger_cart_value: triggerCartValueCents,
          reward_product_id: pwpForm.reward_product_id || null,
          reward_type: pwpForm.reward_type,
          reward_value: rewardValueCents,
          status: "active",
          starts_at: pwpForm.startDate ? new Date(pwpForm.startDate).toISOString() : null,
          ends_at: pwpForm.endDate ? new Date(pwpForm.endDate).toISOString() : null,
        });
        showToast("PWP rule created successfully", "success");
      }

      // Navigate back to promos list
      router.push("/admin/promos");
    } catch (error) {
      console.error("Failed to save promo:", error);
      showToast("Failed to save promo. Please try again.", "error");
    }
  };

  const handleDelete = (): void => {
    // For new promo, just navigate back
    router.push("/admin/promos");
  };

  const typeOptions = [
    { label: "%", value: "percentage" },
    { label: "Fixed Amount", value: "fixed" },
  ];

  const triggerTypeOptions = [
    { label: "Product", value: "product" },
    { label: "Cart Value", value: "cart_value" },
  ];

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Add New {isCoupon ? "Coupon" : "PWP Rule"}
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#E5E7EB] bg-white transition-colors hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M2.5 5H17.5"
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5M15.8333 5V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V5H15.8333Z"
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.33333 9.16667V14.1667"
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.6667 9.16667V14.1667"
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-10 cursor-pointer rounded-lg bg-[#030712] px-6 font-public text-[14px] font-medium text-white transition-colors hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Coupon Form */}
      {isCoupon && (
        <PromoFormSection title="Coupon">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-4">
              <PromoFormInput
                label="Coupon Name"
                placeholder="Enter coupon name"
                value={couponForm.name}
                onChange={(value) => handleCouponChange("name", value)}
                icon={<GridIcon />}
              />

              <PromoFormInput
                label="Coupon Code"
                placeholder="Enter coupon code (e.g., SUMMER20)"
                value={couponForm.code}
                onChange={(value) => handleCouponChange("code", value.toUpperCase())}
                icon={<GridIcon />}
              />

              <PromoFormDropdown
                label="Discount Type"
                value={couponForm.type}
                onChange={(value) => handleCouponChange("type", value)}
                options={typeOptions}
                icon={<GridIcon />}
              />

              <PromoFormInput
                label={couponForm.type === "percentage" ? "Discount %" : "Discount Amount ($)"}
                placeholder={couponForm.type === "percentage" ? "e.g., 20" : "e.g., 15 for $15 off"}
                value={couponForm.value}
                onChange={(value) => handleCouponChange("value", value)}
                icon={<GridIcon />}
              />
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <PromoFormDateInput
                label="Start Date"
                placeholder="Select start date"
                value={couponForm.startDate}
                onChange={(value) => handleCouponChange("startDate", value)}
              />

              <PromoFormDateInput
                label="End Date"
                placeholder="Select end date"
                value={couponForm.endDate}
                onChange={(value) => handleCouponChange("endDate", value)}
              />
            </div>
          </div>
        </PromoFormSection>
      )}

      {/* PWP Rule Form */}
      {!isCoupon && (
        <div className="space-y-6">
          {/* Basic Info Section */}
          <PromoFormSection title="Basic Info">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PromoFormInput
                label="Rule Name"
                placeholder="Enter rule name"
                value={pwpForm.name}
                onChange={(value) => handlePWPChange("name", value)}
                icon={<GridIcon />}
              />

              <PromoFormInput
                label="Rule Description"
                placeholder="e.g., Buy Coffee, get Sunscreen 50% off"
                value={pwpForm.rule_description}
                onChange={(value) => handlePWPChange("rule_description", value)}
                icon={<GridIcon />}
              />
            </div>
          </PromoFormSection>

          {/* Trigger Conditions Section */}
          <PromoFormSection title="Trigger Conditions">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PromoFormDropdown
                label="Trigger Type"
                value={pwpForm.trigger_type}
                onChange={(value) => handlePWPChange("trigger_type", value)}
                options={triggerTypeOptions}
                icon={<GridIcon />}
              />

              {pwpForm.trigger_type === "product" ? (
                <PromoFormProductSelector
                  label="Trigger Product"
                  placeholder="Select the product that triggers this rule"
                  value={pwpForm.trigger_product_id}
                  onChange={(value) => handlePWPChange("trigger_product_id", value)}
                />
              ) : (
                <PromoFormInput
                  label="Minimum Cart Value ($)"
                  placeholder="e.g., 100 for $100"
                  value={pwpForm.trigger_cart_value}
                  onChange={(value) => handlePWPChange("trigger_cart_value", value)}
                  icon={<CartIcon />}
                />
              )}
            </div>
          </PromoFormSection>

          {/* Reward Section */}
          <PromoFormSection title="Reward">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <PromoFormProductSelector
                  label="Reward Product"
                  placeholder="Select the product to discount"
                  value={pwpForm.reward_product_id}
                  onChange={(value) => handlePWPChange("reward_product_id", value)}
                />

                <PromoFormDropdown
                  label="Reward Type"
                  value={pwpForm.reward_type}
                  onChange={(value) => handlePWPChange("reward_type", value)}
                  options={typeOptions}
                  icon={<GridIcon />}
                />
              </div>

              <div className="space-y-4">
                <PromoFormInput
                  label={pwpForm.reward_type === "percentage" ? "Reward Discount %" : "Reward Amount ($)"}
                  placeholder={pwpForm.reward_type === "percentage" ? "e.g., 50" : "e.g., 15 for $15 off"}
                  value={pwpForm.reward_value}
                  onChange={(value) => handlePWPChange("reward_value", value)}
                  icon={<GridIcon />}
                />
              </div>
            </div>
          </PromoFormSection>

          {/* Validity Section */}
          <PromoFormSection title="Validity">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PromoFormDateInput
                label="Start Date"
                placeholder="Select start date"
                value={pwpForm.startDate}
                onChange={(value) => handlePWPChange("startDate", value)}
              />

              <PromoFormDateInput
                label="End Date"
                placeholder="Select end date"
                value={pwpForm.endDate}
                onChange={(value) => handlePWPChange("endDate", value)}
              />
            </div>
          </PromoFormSection>
        </div>
      )}
    </div>
  );
}

export default function AddPromoPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div></div>}>
      <AddPromoPageContent />
    </Suspense>
  );
}
