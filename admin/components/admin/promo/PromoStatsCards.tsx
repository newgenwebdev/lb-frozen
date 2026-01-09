import React from "react";
import { StatCard } from "@/components/admin/StatCard";
import type { PromoStats } from "@/lib/types/promo";

type PromoStatsCardsProps = {
  stats: PromoStats;
  isLoading?: boolean;
};

export function PromoStatsCards({
  stats,
  isLoading = false,
}: PromoStatsCardsProps): React.JSX.Element {
  if (isLoading) {
    return (
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[100px] animate-pulse rounded-lg border border-[#E5E5E5] bg-gray-100"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard
        title="Total Promo"
        value={stats.totalPromo}
      />
      <StatCard
        title="Active Promo"
        value={stats.activePromo}
      />
      <StatCard
        title="Redemption Coupons"
        value={stats.redemptionCoupons}
      />
    </div>
  );
}
