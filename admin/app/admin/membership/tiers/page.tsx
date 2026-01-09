"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { useTiers, useMembershipSettings } from "@/lib/api/queries"
import { useUpdateTier, useDeleteTier } from "@/lib/api/mutations"
import { formatCurrency, formatMultiplier, formatPercentage, getTierColor } from "@/lib/api/tiers"
import { useToast } from "@/contexts/ToastContext"
import type { TierConfig } from "@/lib/types/tier"

/**
 * Tier Configuration List Page
 * Displays all membership tiers with their settings and benefits
 */
export default function TierConfigurationPage(): React.JSX.Element {
  const router = useRouter()
  const { data, isLoading, error } = useTiers(true) // Include inactive tiers
  const { data: membershipSettings } = useMembershipSettings()
  const updateTierMutation = useUpdateTier()
  const deleteTierMutation = useDeleteTier()
  const { showToast, confirm } = useToast()

  // Get dynamic evaluation period from settings
  const evaluationPeriod = membershipSettings?.evaluation_period_months ?? 12

  const handleToggleActive = (tier: TierConfig): void => {
    if (tier.is_default && tier.is_active) {
      showToast("Cannot disable the default tier. Set another tier as default first.", "warning")
      return
    }

    updateTierMutation.mutate({
      id: tier.id,
      data: { is_active: !tier.is_active },
    })
  }

  const handleEdit = (id: string): void => {
    router.push(`/admin/membership/tiers/edit/${id}`)
  }

  const handleDelete = async (tier: TierConfig): Promise<void> => {
    if (tier.is_default) {
      showToast("Cannot delete the default tier. Set another tier as default first.", "warning")
      return
    }

    const confirmed = await confirm({
      title: "Delete Tier",
      message: `Are you sure you want to delete the "${tier.name}" tier?`,
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    })

    if (confirmed) {
      deleteTierMutation.mutate(tier.id)
    }
  }

  // Get default tier name
  const defaultTierName = data?.tiers.find(t => t.is_default)?.name ?? "Classic"

  if (error) {
    return (
      <div className="px-4 md:px-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-red-600">Failed to load tier configurations</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-geist text-[24px] font-medium text-neutral-900">
            Tier Configuration
          </h1>
          <p className="mt-1 text-[14px] text-neutral-500">
            Configure membership tiers and their benefits. Customers automatically upgrade/downgrade based on rolling {evaluationPeriod}-month activity.
          </p>
        </div>
        <button
          onClick={() => router.push("/admin/membership/tiers/add")}
          className="cursor-pointer rounded-lg bg-neutral-900 px-4 py-2 text-[14px] font-medium text-white hover:bg-neutral-800"
        >
          Add Tier
        </button>
      </div>

      {/* Tier Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-900 border-r-transparent" />
          </div>
        ) : (
          data?.tiers.map((tier) => {
            const colors = getTierColor(tier)
            return (
              <div
                key={tier.id}
                className={`rounded-lg border bg-white p-6 ${
                  tier.is_active ? "border-neutral-200" : "border-neutral-200 opacity-60"
                }`}
              >
                {/* Tier Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${colors.bg} ${colors.text}`}
                    >
                      {tier.name}
                    </span>
                    {tier.is_default && (
                      <span className="text-[11px] text-neutral-500">(Default)</span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      tier.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {tier.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Tier Requirements */}
                <div className="mb-4">
                  <p className="mb-2 text-[12px] font-medium text-neutral-500 uppercase tracking-wide">
                    Requirements ({evaluationPeriod} months)
                  </p>
                  <div className="space-y-1 text-[14px]">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Min. Orders:</span>
                      <span className="font-medium text-neutral-900">{tier.order_threshold}+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Min. Spend:</span>
                      <span className="font-medium text-neutral-900">
                        {formatCurrency(tier.spend_threshold)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tier Benefits */}
                <div className="mb-4">
                  <p className="mb-2 text-[12px] font-medium text-neutral-500 uppercase tracking-wide">
                    Benefits
                  </p>
                  <div className="space-y-1 text-[14px]">
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Points Multiplier:</span>
                      <span className="font-medium text-neutral-900">
                        {formatMultiplier(tier.points_multiplier)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Discount:</span>
                      <span className="font-medium text-neutral-900">
                        {formatPercentage(tier.discount_percentage)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Birthday Voucher:</span>
                      <span className="font-medium text-neutral-900">
                        {formatCurrency(tier.birthday_voucher_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={tier.is_active}
                      onChange={() => handleToggleActive(tier)}
                      disabled={tier.is_default && tier.is_active}
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full bg-neutral-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-500 peer-checked:after:translate-x-full peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(tier.id)}
                      className="cursor-pointer text-[14px] text-neutral-900 hover:underline"
                    >
                      Edit
                    </button>
                    {!tier.is_default && (
                      <button
                        onClick={() => handleDelete(tier)}
                        className="cursor-pointer text-[14px] text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Info Section */}
      <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 text-[14px] font-medium text-blue-900">How Tier Upgrades Work</h3>
        <ul className="space-y-1 text-[13px] text-blue-800">
          <li>• All customers start at the default tier ({defaultTierName}) automatically</li>
          <li>• Tiers are evaluated based on rolling {evaluationPeriod}-month activity (orders + spend)</li>
          <li>• Customers upgrade automatically when they meet a higher tier&apos;s requirements</li>
          <li>• Customers may downgrade if their {evaluationPeriod}-month activity drops below their current tier&apos;s threshold</li>
          <li>• Points multiplier applies to all points earned from purchases</li>
        </ul>
      </div>
    </div>
  )
}
