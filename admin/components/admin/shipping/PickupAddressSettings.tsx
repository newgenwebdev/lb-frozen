"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useShippingSettings, useUpdateShippingSettings } from "@/lib/api/queries";
import { useToast } from "@/contexts/ToastContext";

/**
 * Validate Singapore phone number for EasyParcel
 * Must be 8 digits starting with 6, 8, or 9
 */
function isValidSingaporePhone(phone: string): boolean {
  if (!phone) return false;

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // Remove country code if present (65)
  if (cleaned.startsWith("65") && cleaned.length > 8) {
    cleaned = cleaned.slice(2);
  }

  // Singapore numbers are 8 digits starting with 6, 8, or 9
  if (cleaned.length !== 8) return false;
  if (!cleaned.startsWith("6") && !cleaned.startsWith("8") && !cleaned.startsWith("9")) return false;

  return true;
}

const PickupAddressSchema = z.object({
  sender_name: z.string().min(1, "Business name is required"),
  sender_phone: z.string()
    .min(1, "Phone number is required")
    .refine(isValidSingaporePhone, {
      message: "Must be a valid Singapore phone number (8 digits starting with 6, 8, or 9)",
    }),
  sender_address: z.string().min(1, "Address is required"),
  sender_unit: z.string().optional(),
  sender_postcode: z.string().length(6, "Postal code must be 6 digits"),
  sender_country: z.string().default("SG"),
});

type PickupAddressForm = z.infer<typeof PickupAddressSchema>;

export function PickupAddressSettings(): React.JSX.Element {
  const { showToast } = useToast();
  const { data, isLoading } = useShippingSettings();
  const settings = data?.settings;
  const updateMutation = useUpdateShippingSettings();

  const form = useForm<PickupAddressForm>({
    resolver: zodResolver(PickupAddressSchema),
    defaultValues: {
      sender_name: "",
      sender_phone: "",
      sender_address: "",
      sender_unit: "",
      sender_postcode: "",
      sender_country: "SG",
    },
  });

  // Reset form when data loads
  useEffect(() => {
    if (settings) {
      // Clean up phone number - remove country code and non-digits if present
      let phone = settings.sender_phone || "";
      phone = phone.replace(/\D/g, ""); // Remove non-digits
      if (phone.startsWith("65") && phone.length > 8) {
        phone = phone.slice(2); // Remove country code
      }

      form.reset({
        sender_name: settings.sender_name || "",
        sender_phone: phone,
        sender_address: settings.sender_address || "",
        sender_unit: settings.sender_unit || "",
        sender_postcode: settings.sender_postcode || "",
        sender_country: settings.sender_country || "SG",
      });
    }
  }, [settings, form]);

  const onSubmit = async (data: PickupAddressForm): Promise<void> => {
    try {
      await updateMutation.mutateAsync(data);
      showToast("Pickup address saved successfully!", "success");
    } catch {
      showToast("Failed to save settings. Please try again.", "error");
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
        <div className="mb-2 h-6 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mb-6 h-4 w-72 animate-pulse rounded bg-gray-200" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <div className="mb-2 h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
      <h2 className="mb-2 font-geist text-[20px] font-medium leading-[120%] tracking-[-0.4px] text-[#030712]">
        Pickup Address
      </h2>
      <p className="mb-6 font-public text-[14px] text-[#6A7282]">
        Configure your business pickup address for EasyParcel shipments.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
            Business Name <span className="text-[#DC2626]">*</span>
          </label>
          <input
            {...form.register("sender_name")}
            placeholder="Your business name"
            className="w-full rounded-lg border border-[#E5E5E5] px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none transition-colors focus:border-[#030712]"
          />
          {form.formState.errors.sender_name && (
            <p className="mt-1 font-public text-[12px] text-[#DC2626]">
              {form.formState.errors.sender_name.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
            Contact Phone <span className="text-[#DC2626]">*</span>
          </label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-[#E5E5E5] bg-[#F9FAFB] px-3 font-public text-[14px] font-medium text-[#6A7282]">
              +65
            </span>
            <input
              {...form.register("sender_phone")}
              placeholder="8123 4567"
              maxLength={9}
              className="w-full rounded-r-lg border border-[#E5E5E5] px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none transition-colors focus:border-[#030712]"
              onInput={(e) => {
                // Only allow digits and limit to 8 characters
                const input = e.currentTarget;
                input.value = input.value.replace(/\D/g, "").slice(0, 8);
              }}
            />
          </div>
          <p className="mt-1 font-public text-[12px] text-[#6A7282]">
            8 digits starting with 6, 8, or 9
          </p>
          {form.formState.errors.sender_phone && (
            <p className="mt-1 font-public text-[12px] text-[#DC2626]">
              {form.formState.errors.sender_phone.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
            Address <span className="text-[#DC2626]">*</span>
          </label>
          <input
            {...form.register("sender_address")}
            placeholder="Street address"
            className="w-full rounded-lg border border-[#E5E5E5] px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none transition-colors focus:border-[#030712]"
          />
          {form.formState.errors.sender_address && (
            <p className="mt-1 font-public text-[12px] text-[#DC2626]">
              {form.formState.errors.sender_address.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
              Unit Number
            </label>
            <input
              {...form.register("sender_unit")}
              placeholder="#01-01"
              className="w-full rounded-lg border border-[#E5E5E5] px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none transition-colors focus:border-[#030712]"
            />
          </div>
          <div>
            <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
              Postal Code <span className="text-[#DC2626]">*</span>
            </label>
            <input
              {...form.register("sender_postcode")}
              placeholder="123456"
              maxLength={6}
              className="w-full rounded-lg border border-[#E5E5E5] px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none transition-colors focus:border-[#030712]"
            />
            {form.formState.errors.sender_postcode && (
              <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                {form.formState.errors.sender_postcode.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
            Country
          </label>
          <input
            value="Singapore"
            readOnly
            disabled
            className="w-full rounded-lg border border-[#E5E5E5] bg-[#F9FAFB] px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] text-[#030712] outline-none cursor-not-allowed"
          />
          <p className="mt-1 font-public text-[12px] text-[#6A7282]">
            EasyParcel Singapore API only supports Singapore addresses.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="cursor-pointer rounded-lg bg-[#030712] px-4 py-2 font-geist text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
