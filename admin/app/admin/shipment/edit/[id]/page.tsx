"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui";
import { FormInput, FormCurrencyInput, FormDropdown, FormSection } from "@/components/admin/membership";
import { useUpdateShippingOption } from "@/lib/api/queries";
import { getShippingOptionById } from "@/lib/api/shipping-options";
import { useToast } from "@/contexts/ToastContext";
import type { ShippingOptionFormData, ShippingOptionPrice } from "@/lib/types/shipping-option";

const ETA_OPTIONS = [
  "Ship in 24 hours.",
  "1-2 days",
  "2-3 days",
  "3-5 days",
  "5-7 days",
  "7-10 days",
  "10-14 days",
];

type FormData = {
  name: string;
  price: number;
  eta: string;
  enabled: boolean;
};

export default function EditShipmentPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const shippingOptionId = params.id as string;
  const updateShippingOptionMutation = useUpdateShippingOption();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    name: "",
    price: 0,
    eta: "2-3 days",
    enabled: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    eta?: string;
  }>({});

  useEffect(() => {
    const loadShippingOption = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const shippingOption = await getShippingOptionById(shippingOptionId);
        if (shippingOption) {
          // Convert from cents to main currency unit for display
          setFormData({
            name: shippingOption.name || "",
            price: shippingOption.base_rate_sgd / 100,
            eta: shippingOption.eta || "2-3 days",
            enabled: shippingOption.status === "Active",
          });
        } else {
          showToast("Shipping option not found", "error");
          router.push("/admin/shipment");
        }
      } catch (error) {
        console.error("Failed to load shipping option:", error);
        showToast("Failed to load shipping option data. Please try again.", "error");
        router.push("/admin/shipment");
      } finally {
        setIsLoading(false);
      }
    };

    if (shippingOptionId) {
      loadShippingOption();
    }
  }, [shippingOptionId, router, showToast]);

  const handleInputChange = (field: keyof FormData, value: string | number | boolean): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Shipping option name is required";
    } else if (formData.name.length > 255) {
      newErrors.name = "Name must be 255 characters or less";
    }

    if (formData.price < 0) {
      newErrors.price = "Price must be zero or positive";
    }

    if (!formData.eta.trim()) {
      newErrors.eta = "ETA is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent): Promise<void> => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Convert form data to API format
    // Medusa stores prices in cents - only SGD
    const prices: ShippingOptionPrice[] = [
      { currency_code: "sgd", amount: Math.round(formData.price * 100) },
    ];

    const apiData: Partial<ShippingOptionFormData> = {
      name: formData.name,
      prices,
      eta: formData.eta,
      enabled: formData.enabled,
    };

    updateShippingOptionMutation.mutate(
      { id: shippingOptionId, data: apiData },
      {
        onSuccess: () => {
          showToast("Shipping option updated successfully", "success");
          router.push("/admin/shipment");
        },
        onError: (error) => {
          console.error("Failed to update shipping option:", error);
          showToast("Failed to update shipping option. Please try again.", "error");
        },
      }
    );
  };

  const handleCancel = (): void => {
    router.push("/admin/shipment");
  };

  if (isLoading) {
    return (
      <div className="px-4 md:px-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
            <p className="mt-4 font-public text-[14px] text-[#6A7282]">Loading shipping option...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Edit Shipping Option
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={updateShippingOptionMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={updateShippingOptionMutation.isPending}
          >
            {updateShippingOptionMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Shipping Option Information">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormInput
              label="Shipping Option Name"
              placeholder="Enter shipping option name (e.g., Standard Shipping)"
              value={formData.name}
              onChange={(value) => handleInputChange("name", value)}
              error={errors.name}
            />
            <FormDropdown
              label="ETA"
              value={formData.eta}
              onChange={(value) => handleInputChange("eta", value)}
              options={ETA_OPTIONS}
              error={errors.eta}
            />
          </div>
        </FormSection>

        <FormSection title="Pricing">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormCurrencyInput
              label="Price (SGD)"
              placeholder="0.00"
              value={formData.price}
              onChange={(value) => handleInputChange("price", value)}
              min={0}
              error={errors.price}
            />
          </div>
        </FormSection>

        <FormSection title="Availability">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormDropdown
              label="Status"
              value={formData.enabled ? "Active" : "Non Active"}
              onChange={(value) => handleInputChange("enabled", value === "Active")}
              options={["Active", "Non Active"]}
            />
          </div>
          <p className="mt-2 text-[12px] text-[#6A7282]">
            Active shipping options will be available for customers during checkout.
          </p>
        </FormSection>
      </form>
    </div>
  );
}
