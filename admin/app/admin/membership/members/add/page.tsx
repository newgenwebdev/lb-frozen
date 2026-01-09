"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { FormSection, FormNumberInput } from "@/components/admin/membership";
import { useNonMemberCustomers } from "@/lib/api/queries";
import { useCreateMember } from "@/lib/api/mutations";
import { useToast } from "@/contexts/ToastContext";

type FormData = {
  customer_id: string;
  initial_points: number;
};

export default function AddMemberPage(): React.JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const createMemberMutation = useCreateMember();

  const [formData, setFormData] = useState<FormData>({
    customer_id: "",
    initial_points: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null>(null);

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch non-member customers
  const { data: customersData, isLoading: isLoadingCustomers } =
    useNonMemberCustomers({
      search: debouncedSearch || undefined,
      limit: 10,
    });

  const handleSearchChange = useCallback(
    (value: string): void => {
      setSearchQuery(value);
      setShowDropdown(true);
      // Clear selection if user starts typing again
      if (selectedCustomer) {
        setSelectedCustomer(null);
        setFormData((prev) => ({ ...prev, customer_id: "" }));
      }
    },
    [selectedCustomer]
  );

  const handleSelectCustomer = (customer: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  }): void => {
    setSelectedCustomer(customer);
    setFormData((prev) => ({ ...prev, customer_id: customer.id }));
    setSearchQuery(
      customer.first_name || customer.last_name
        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
        : customer.email
    );
    setShowDropdown(false);
    if (errors.customer_id) {
      setErrors((prev) => ({ ...prev, customer_id: undefined }));
    }
  };

  const handleInputChange = (
    field: keyof FormData,
    value: string | number
  ): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.customer_id) {
      newErrors.customer_id = "Please select a customer";
    }

    if (formData.initial_points < 0) {
      newErrors.initial_points = "Initial points cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createMemberMutation.mutate(
      {
        customer_id: formData.customer_id,
        initial_points:
          formData.initial_points > 0 ? formData.initial_points : undefined,
      },
      {
        onSuccess: () => {
          router.push("/admin/membership");
        },
        onError: (error) => {
          console.error("Failed to create member:", error);
          showToast("Failed to create member. Please try again.", "error");
        },
      }
    );
  };

  const handleCancel = (): void => {
    router.push("/admin/membership");
  };

  const customers = customersData?.customers || [];

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Add Member
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleCancel}
            disabled={createMemberMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={createMemberMutation.isPending}
          >
            {createMemberMutation.isPending ? "Creating..." : "Create Member"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Customer Selection */}
            <FormSection title="Select Customer">
              <div className="relative">
                <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
                  Customer
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by name or email..."
                  className={`w-full rounded-lg border px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors placeholder:text-[#99A1AF] ${
                    errors.customer_id
                      ? "border-[#DC2626] focus:border-[#DC2626]"
                      : "border-[#E5E5E5] focus:border-[#030712]"
                  }`}
                />
                {errors.customer_id && (
                  <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                    {errors.customer_id}
                  </p>
                )}

                {/* Dropdown */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                    {isLoadingCustomers ? (
                      <div className="px-4 py-3 text-center font-public text-[14px] text-[#6A7282]">
                        Loading...
                      </div>
                    ) : customers.length === 0 ? (
                      <div className="px-4 py-3 text-center font-public text-[14px] text-[#6A7282]">
                        {debouncedSearch
                          ? "No customers found"
                          : "Type to search customers"}
                      </div>
                    ) : (
                      customers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => handleSelectCustomer(customer)}
                          className="w-full px-4 py-3 text-left transition-colors hover:bg-[#F9FAFB]"
                        >
                          <p className="font-public text-[14px] font-medium text-[#030712]">
                            {customer.first_name || customer.last_name
                              ? `${customer.first_name || ""} ${
                                  customer.last_name || ""
                                }`.trim()
                              : "No name"}
                          </p>
                          <p className="font-public text-[12px] text-[#6A7282]">
                            {customer.email}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Selected Customer Info */}
              {selectedCustomer && (
                <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <p className="font-public text-[12px] text-[#6A7282]">
                    Selected Customer
                  </p>
                  <p className="mt-1 font-public text-[14px] font-medium text-[#030712]">
                    {selectedCustomer.first_name || selectedCustomer.last_name
                      ? `${selectedCustomer.first_name || ""} ${
                          selectedCustomer.last_name || ""
                        }`.trim()
                      : "No name"}
                  </p>
                  <p className="font-public text-[13px] text-[#6A7282]">
                    {selectedCustomer.email}
                  </p>
                </div>
              )}
            </FormSection>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Initial Points */}
            <FormSection title="Membership Settings">
              <FormNumberInput
                label="Initial Points (Optional)"
                value={formData.initial_points}
                onChange={(value) => handleInputChange("initial_points", value)}
                min={0}
                step={1}
                error={errors.initial_points}
              />
              <p className="font-public text-[12px] text-[#6A7282]">
                Give the member bonus points upon registration. Leave at 0 for
                no bonus.
              </p>
            </FormSection>
          </div>
        </div>
      </form>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
