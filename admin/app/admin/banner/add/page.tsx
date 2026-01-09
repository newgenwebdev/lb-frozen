"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { FormInput, FormSection } from "@/components/admin/membership";
import {
  BannerPreview,
  ColorInput,
  DateInput,
} from "@/components/admin/banner";
import { useCreateBanner } from "@/lib/api/queries";
import { useToast } from "@/contexts/ToastContext";
import type { BannerFormData } from "@/lib/types/banner";

export default function AddBannerPage(): React.JSX.Element {
  const router = useRouter();
  const createBannerMutation = useCreateBanner();
  const { showToast } = useToast();

  const [formData, setFormData] = useState<BannerFormData>({
    text: "",
    link: "",
    startDate: "",
    endDate: "",
    backgroundColor: "#007AFF",
    textColor: "#FFFFFF",
  });

  const [linkError, setLinkError] = useState<string>("");

  // Validate URL
  const isValidUrl = (urlString: string): boolean => {
    if (!urlString.trim()) return true; // Allow empty (optional field)
    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleInputChange = (
    field: keyof BannerFormData,
    value: string
  ): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (field === "link" && linkError) {
      setLinkError("");
    }
  };

  const handleLinkBlur = (): void => {
    if (formData.link.trim() && !isValidUrl(formData.link)) {
      setLinkError("Please enter a valid URL (e.g., https://example.com)");
    } else {
      setLinkError("");
    }
  };

  const handleSubmit = async (
    e?: React.FormEvent | React.MouseEvent
  ): Promise<void> => {
    e?.preventDefault();

    // Validate required fields
    if (!formData.text.trim()) {
      showToast("Please enter announcement text", "error");
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      showToast("Please select both start and end dates", "error");
      return;
    }
    // Validate link URL
    if (formData.link.trim() && !isValidUrl(formData.link)) {
      setLinkError("Please enter a valid URL (e.g., https://example.com)");
      return;
    }

    createBannerMutation.mutate(formData, {
      onSuccess: () => {
        showToast("Banner created successfully!", "success");
        router.push("/admin/banner");
      },
      onError: (error) => {
        console.error("Failed to create banner:", error);
        showToast("Failed to create banner. Please try again.", "error");
      },
    });
  };

  const handleCancel = (): void => {
    router.push("/admin/banner");
  };

  // Format period from dates
  const formatPeriod = (startDate: string, endDate: string): string => {
    if (!startDate && !endDate) return "";
    if (!endDate) {
      const date = new Date(startDate);
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    }
    if (!startDate) {
      const date = new Date(endDate);
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startFormatted = start.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    const endFormatted = end.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return startFormatted === endFormatted
      ? startFormatted
      : `${startFormatted} - ${endFormatted}`;
  };

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Create New Banner
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={createBannerMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={createBannerMutation.isPending}
          >
            {createBannerMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Preview Section */}
        <BannerPreview
          text={formData.text}
          backgroundColor={formData.backgroundColor}
          textColor={formData.textColor}
          link={formData.link}
        />

        {/* Announcement Text */}
        <FormSection title="Announcement Text">
          <FormInput
            label="Announcement Text"
            placeholder="Type announcement here"
            value={formData.text}
            onChange={(value) => handleInputChange("text", value)}
          />
        </FormSection>

        {/* Link */}
        <FormSection title="Link">
          <div className="relative">
            <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
              Link
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M6.66667 8.66667C6.95333 9.04 7.31333 9.34 7.72 9.54667C8.12667 9.75333 8.57333 9.86 9.02667 9.86C9.48 9.86 9.92667 9.75333 10.3333 9.54667C10.74 9.34 11.1 9.04 11.3867 8.66667L12.72 7.33333C13.3067 6.6 13.6667 5.66667 13.6667 4.66667C13.6667 3.66667 13.3067 2.73333 12.72 2C12.1333 1.26667 11.2 0.906667 10.2 0.906667C9.2 0.906667 8.26667 1.26667 7.53333 2L6.66667 2.86667"
                    stroke="#6A7282"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.33333 7.33333C9.04667 6.96 8.68667 6.66 8.28 6.45333C7.87333 6.24667 7.42667 6.14 6.97333 6.14C6.52 6.14 6.07333 6.24667 5.66667 6.45333C5.26 6.66 4.9 6.96 4.61333 7.33333L3.28 8.66667C2.69333 9.4 2.33333 10.3333 2.33333 11.3333C2.33333 12.3333 2.69333 13.2667 3.28 14C3.86667 14.7333 4.8 15.0933 5.8 15.0933C6.8 15.0933 7.73333 14.7333 8.46667 14L9.33333 13.1333"
                    stroke="#6A7282"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={formData.link}
                onChange={(e) => handleInputChange("link", e.target.value)}
                onBlur={handleLinkBlur}
                placeholder="e.g. https://youtube.com/"
                className={`w-full rounded-lg border pl-10 pr-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors placeholder:text-[#99A1AF] ${
                  linkError
                    ? "border-[#DC2626] focus:border-[#DC2626]"
                    : "border-[#E5E5E5] focus:border-[#030712]"
                }`}
              />
            </div>
            {linkError && (
              <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                {linkError}
              </p>
            )}
          </div>
        </FormSection>

        {/* Date Selection */}
        <FormSection title="Date Selection">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateInput
              label="Start Date"
              value={formData.startDate}
              onChange={(value) => handleInputChange("startDate", value)}
            />
            <DateInput
              label="End Date"
              value={formData.endDate}
              onChange={(value) => handleInputChange("endDate", value)}
            />
          </div>
        </FormSection>

        {/* Color Selection */}
        <FormSection title="Color Selection">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ColorInput
              label="Background Color"
              value={formData.backgroundColor}
              onChange={(value) => handleInputChange("backgroundColor", value)}
            />
            <ColorInput
              label="Text Color"
              value={formData.textColor}
              onChange={(value) => handleInputChange("textColor", value)}
            />
          </div>
        </FormSection>
      </form>
    </div>
  );
}
