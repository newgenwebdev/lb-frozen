"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import {
  FormInput,
  FormNumberInput,
  FormDropdown,
  FormCheckbox,
  FormSection,
} from "@/components/admin/membership";
import { useToast } from "@/contexts/ToastContext";
import type { MembershipPointsFormData } from "@/lib/types/membership";

export default function AddMembershipPage(): React.JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<MembershipPointsFormData>({
    // Membership Name
    name: "",

    // Earning Rules
    currency: "SGD",
    rounding: "Floor",
    pointsPerCurrency: 1,
    includeTaxes: true,
    includeShipping: true,
    excludeDiscountedItems: true,

    // Birthday Bonus
    birthdayMultiplier: "SGD",
    birthdayMonthlyCap: 1,
    applyToFirstOrderOnly: true,

    // Point Expiration
    expirationPolicy: "Expire after N Months",
    monthsUntilExpiry: 24,

    // Redemption Rules
    valuePer1SGD: 0.1,
    redeemStep: 10,
    minimumPointsPerOrder: 10,
    maxPercentOrderPayableByPoints: 10,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof MembershipPointsFormData, value: string | number | boolean): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Integrate with API
      // await createMembershipPoints(formData);
      console.log("Form data:", formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Navigate back to membership list
      router.push("/admin/membership");
    } catch (error) {
      console.error("Failed to save membership points:", error);
      showToast("Failed to save membership points. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = (): void => {
    router.push("/admin/membership");
  };

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Membership & Points
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Membership Name */}
            <FormSection title="Membership Name">
              <FormInput
                label="Name"
                placeholder="e.g. July Edition"
                value={formData.name}
                onChange={(value) => handleInputChange("name", value)}
              />
            </FormSection>

            {/* Earning Rules */}
            <FormSection title="Earning Rules">
              <div className="grid grid-cols-3 gap-4">
                <FormDropdown
                  label="Currency"
                  value={formData.currency}
                  onChange={(value) => handleInputChange("currency", value)}
                  options={["SGD", "USD", "IDR"]}
                />
                <FormDropdown
                  label="Rounding"
                  value={formData.rounding}
                  onChange={(value) => handleInputChange("rounding", value)}
                  options={["Floor", "Ceiling", "Round"]}
                />
                <FormNumberInput
                  label="Points per Currency"
                  value={formData.pointsPerCurrency}
                  onChange={(value) => handleInputChange("pointsPerCurrency", value)}
                  min={0}
                  step={1}
                />
              </div>

              <div className="space-y-3 pt-2">
                <FormCheckbox
                  label="Include taxes in earn calculation"
                  checked={formData.includeTaxes}
                  onChange={(checked) => handleInputChange("includeTaxes", checked)}
                />
                <FormCheckbox
                  label="Include shipping in earn calculation"
                  checked={formData.includeShipping}
                  onChange={(checked) => handleInputChange("includeShipping", checked)}
                />
                <FormCheckbox
                  label="Exclude discounted items"
                  checked={formData.excludeDiscountedItems}
                  onChange={(checked) => handleInputChange("excludeDiscountedItems", checked)}
                />
              </div>
            </FormSection>

            {/* Birthday Bonus */}
            <FormSection title="Birthday Bonus">
              <div className="grid grid-cols-2 gap-4">
                <FormDropdown
                  label="Multiplier (e.g. 2x)"
                  value={formData.birthdayMultiplier}
                  onChange={(value) => handleInputChange("birthdayMultiplier", value)}
                  options={["SGD", "2x", "3x", "5x"]}
                />
                <FormNumberInput
                  label="Monthly Cap (Points)"
                  value={formData.birthdayMonthlyCap}
                  onChange={(value) => handleInputChange("birthdayMonthlyCap", value)}
                  min={0}
                  step={1}
                />
              </div>

              <div className="pt-2">
                <FormCheckbox
                  label="Apply to first order only in birthday month"
                  checked={formData.applyToFirstOrderOnly}
                  onChange={(checked) => handleInputChange("applyToFirstOrderOnly", checked)}
                />
              </div>
            </FormSection>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Point Expiration */}
            <FormSection title="Point Expiration">
              <div className="grid grid-cols-2 gap-4">
                <FormDropdown
                  label="Policy"
                  value={formData.expirationPolicy}
                  onChange={(value) => handleInputChange("expirationPolicy", value)}
                  options={["Expire after N Months", "Never Expire", "Expire on Date"]}
                />
                <FormNumberInput
                  label="Months until Expiry"
                  value={formData.monthsUntilExpiry}
                  onChange={(value) => handleInputChange("monthsUntilExpiry", value)}
                  min={1}
                  step={1}
                />
              </div>
            </FormSection>

            {/* Redemption Rules */}
            <FormSection title="Redemption Rules">
              <div className="space-y-4">
                <FormNumberInput
                  label="Value per 1 SGD"
                  value={formData.valuePer1SGD}
                  onChange={(value) => handleInputChange("valuePer1SGD", value)}
                  min={0}
                  step={0.1}
                />
                <FormNumberInput
                  label="Redeem Step"
                  value={formData.redeemStep}
                  onChange={(value) => handleInputChange("redeemStep", value)}
                  min={1}
                  step={1}
                />
                <FormNumberInput
                  label="Minimum Points per Order"
                  value={formData.minimumPointsPerOrder}
                  onChange={(value) => handleInputChange("minimumPointsPerOrder", value)}
                  min={0}
                  step={1}
                />
                <FormNumberInput
                  label="Max % of order payable by points"
                  value={formData.maxPercentOrderPayableByPoints}
                  onChange={(value) => handleInputChange("maxPercentOrderPayableByPoints", value)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </FormSection>
          </div>
        </div>
      </form>
    </div>
  );
}

