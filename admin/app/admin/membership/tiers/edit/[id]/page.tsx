"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTier, useMembershipSettings } from "@/lib/api/queries"
import { useUpdateTier } from "@/lib/api/mutations"
import { useToast } from "@/contexts/ToastContext"

type FormData = {
  name: string
  slug: string
  rank: number
  order_threshold: number
  spend_threshold: number // In dollars for UI display
  points_multiplier: number
  discount_percentage: number
  birthday_voucher_amount: number // In dollars for UI display
  is_default: boolean
  is_active: boolean
}

type FormErrors = Partial<Record<keyof FormData, string>>

/**
 * Edit Tier Page
 * Form to edit an existing membership tier
 */
export default function EditTierPage(): React.JSX.Element {
  const router = useRouter()
  const params = useParams()
  const tierId = params.id as string

  const { data: tier, isLoading, error } = useTier(tierId)
  const { data: membershipSettings } = useMembershipSettings()
  const updateTierMutation = useUpdateTier()
  const { showToast } = useToast()

  // Get dynamic evaluation period from settings
  const evaluationPeriod = membershipSettings?.evaluation_period_months ?? 12

  const [formData, setFormData] = useState<FormData>({
    name: "",
    slug: "",
    rank: 0,
    order_threshold: 0,
    spend_threshold: 0,
    points_multiplier: 1,
    discount_percentage: 0,
    birthday_voucher_amount: 0,
    is_default: false,
    is_active: true,
  })

  const [errors, setErrors] = useState<FormErrors>({})

  // Populate form when tier data loads
  useEffect(() => {
    if (tier) {
      setFormData({
        name: tier.name,
        slug: tier.slug,
        rank: tier.rank,
        order_threshold: tier.order_threshold,
        spend_threshold: tier.spend_threshold / 100, // Convert cents to dollars
        points_multiplier: tier.points_multiplier,
        discount_percentage: tier.discount_percentage,
        birthday_voucher_amount: tier.birthday_voucher_amount / 100, // Convert cents to dollars
        is_default: tier.is_default,
        is_active: tier.is_active,
      })
    }
  }, [tier])

  const handleInputChange = (
    field: keyof FormData,
    value: string | number | boolean
  ): void => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.slug.trim()) {
      newErrors.slug = "Slug is required"
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = "Slug must contain only lowercase letters, numbers, and hyphens"
    }

    if (formData.rank < 0) {
      newErrors.rank = "Rank must be 0 or greater"
    }

    if (formData.order_threshold < 0) {
      newErrors.order_threshold = "Order threshold must be 0 or greater"
    }

    if (formData.spend_threshold < 0) {
      newErrors.spend_threshold = "Spend threshold must be 0 or greater"
    }

    if (formData.points_multiplier < 1) {
      newErrors.points_multiplier = "Multiplier must be at least 1"
    }

    if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      newErrors.discount_percentage = "Discount must be between 0 and 100"
    }

    if (formData.birthday_voucher_amount < 0) {
      newErrors.birthday_voucher_amount = "Birthday voucher must be 0 or greater"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (!validateForm()) return

    // Convert dollars to cents for API
    updateTierMutation.mutate(
      {
        id: tierId,
        data: {
          name: formData.name.trim(),
          slug: formData.slug.trim().toLowerCase(),
          rank: formData.rank,
          order_threshold: formData.order_threshold,
          spend_threshold: Math.round(formData.spend_threshold * 100),
          points_multiplier: formData.points_multiplier,
          discount_percentage: formData.discount_percentage,
          birthday_voucher_amount: Math.round(formData.birthday_voucher_amount * 100),
          is_default: formData.is_default,
          is_active: formData.is_active,
        },
      },
      {
        onSuccess: () => {
          router.push("/admin/membership/tiers")
        },
        onError: (err) => {
          console.error("Failed to update tier:", err)
          showToast(err.message || "Failed to update tier. Please try again.", "error")
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center px-4 md:px-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-900 border-r-transparent" />
      </div>
    )
  }

  if (error || !tier) {
    return (
      <div className="px-4 md:px-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-red-600">Failed to load tier. It may have been deleted.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-geist text-[24px] font-medium text-neutral-900">
            Edit Tier: {tier.name}
          </h1>
          <p className="mt-1 text-[14px] text-neutral-500">
            Update tier requirements and benefits
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/membership/tiers")}
            className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-4 py-2 text-[14px] font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="tier-form"
            disabled={updateTierMutation.isPending}
            className="cursor-pointer rounded-lg bg-neutral-900 px-4 py-2 text-[14px] font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updateTierMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <form id="tier-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Basic Information */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-[16px] font-medium text-neutral-900">Basic Information</h2>

            {/* Name */}
            <div className="mb-4">
              <label className="mb-1 block text-[14px] font-medium text-neutral-700">
                Tier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="e.g., Gold"
                className={`w-full rounded-lg border px-3 py-2 text-[14px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                  errors.name ? "border-red-500" : "border-neutral-300"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-[12px] text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Slug */}
            <div className="mb-4">
              <label className="mb-1 block text-[14px] font-medium text-neutral-700">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleInputChange("slug", e.target.value.toLowerCase())}
                placeholder="e.g., gold"
                className={`w-full rounded-lg border px-3 py-2 text-[14px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                  errors.slug ? "border-red-500" : "border-neutral-300"
                }`}
              />
              {errors.slug && (
                <p className="mt-1 text-[12px] text-red-500">{errors.slug}</p>
              )}
              <p className="mt-1 text-[12px] text-neutral-500">
                URL-friendly identifier (lowercase, no spaces)
              </p>
            </div>

            {/* Rank */}
            <div className="mb-4">
              <label className="mb-1 block text-[14px] font-medium text-neutral-700">
                Rank <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.rank}
                onChange={(e) => handleInputChange("rank", parseInt(e.target.value) || 0)}
                min={0}
                className={`w-full rounded-lg border px-3 py-2 text-[14px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                  errors.rank ? "border-red-500" : "border-neutral-300"
                }`}
              />
              {errors.rank && (
                <p className="mt-1 text-[12px] text-red-500">{errors.rank}</p>
              )}
              <p className="mt-1 text-[12px] text-neutral-500">
                Higher rank = better tier (0 = lowest)
              </p>
            </div>

            {/* Is Default */}
            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => handleInputChange("is_default", e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <label htmlFor="is_default" className="cursor-pointer text-[14px] text-neutral-700">
                Set as default tier for new members
              </label>
            </div>

            {/* Is Active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => handleInputChange("is_active", e.target.checked)}
                disabled={tier.is_default && formData.is_active}
                className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <label htmlFor="is_active" className="cursor-pointer text-[14px] text-neutral-700">
                Tier is active
              </label>
              {tier.is_default && (
                <span className="text-[12px] text-neutral-500">(default tier cannot be deactivated)</span>
              )}
            </div>
          </div>

          {/* Requirements */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-[16px] font-medium text-neutral-900">
              Qualification Requirements
            </h2>
            <p className="mb-4 text-[13px] text-neutral-500">
              Customers must meet BOTH thresholds within a rolling {evaluationPeriod}-month period to qualify for this tier.
            </p>

            {/* Order Threshold */}
            <div className="mb-4">
              <label className="mb-1 block text-[14px] font-medium text-neutral-700">
                Minimum Orders
              </label>
              <input
                type="number"
                value={formData.order_threshold}
                onChange={(e) => handleInputChange("order_threshold", parseInt(e.target.value) || 0)}
                min={0}
                className={`w-full rounded-lg border px-3 py-2 text-[14px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                  errors.order_threshold ? "border-red-500" : "border-neutral-300"
                }`}
              />
              {errors.order_threshold && (
                <p className="mt-1 text-[12px] text-red-500">{errors.order_threshold}</p>
              )}
            </div>

            {/* Spend Threshold */}
            <div className="mb-4">
              <label className="mb-1 block text-[14px] font-medium text-neutral-700">
                Minimum Spend ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                <input
                  type="number"
                  value={formData.spend_threshold}
                  onChange={(e) => handleInputChange("spend_threshold", parseFloat(e.target.value) || 0)}
                  min={0}
                  step={0.01}
                  className={`w-full rounded-lg border py-2 pl-7 pr-3 text-[14px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                    errors.spend_threshold ? "border-red-500" : "border-neutral-300"
                  }`}
                />
              </div>
              {errors.spend_threshold && (
                <p className="mt-1 text-[12px] text-red-500">{errors.spend_threshold}</p>
              )}
            </div>
          </div>

          {/* Benefits */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6 lg:col-span-2">
            <h2 className="mb-4 text-[16px] font-medium text-neutral-900">Tier Benefits</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Points Multiplier */}
              <div>
                <label className="mb-1 block text-[14px] font-medium text-neutral-700">
                  Points Multiplier
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.points_multiplier}
                    onChange={(e) => handleInputChange("points_multiplier", parseFloat(e.target.value) || 1)}
                    min={1}
                    step={0.5}
                    className={`w-full rounded-lg border py-2 pl-3 pr-8 text-[14px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                      errors.points_multiplier ? "border-red-500" : "border-neutral-300"
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">x</span>
                </div>
                {errors.points_multiplier && (
                  <p className="mt-1 text-[12px] text-red-500">{errors.points_multiplier}</p>
                )}
                <p className="mt-1 text-[12px] text-neutral-500">
                  e.g., 1.5x = 50% more points
                </p>
              </div>

              {/* Birthday Voucher */}
              <div>
                <label className="mb-1 block text-[14px] font-medium text-neutral-700">
                  Birthday Voucher ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                  <input
                    type="number"
                    value={formData.birthday_voucher_amount}
                    onChange={(e) => handleInputChange("birthday_voucher_amount", parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                    className={`w-full rounded-lg border py-2 pl-7 pr-3 text-[14px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 ${
                      errors.birthday_voucher_amount ? "border-red-500" : "border-neutral-300"
                    }`}
                  />
                </div>
                {errors.birthday_voucher_amount && (
                  <p className="mt-1 text-[12px] text-red-500">{errors.birthday_voucher_amount}</p>
                )}
                <p className="mt-1 text-[12px] text-neutral-500">
                  Voucher sent on birthday
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
