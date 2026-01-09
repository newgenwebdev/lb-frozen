import React from "react";

interface CustomRevenueTooltipProps {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    value: number;
  }>;
  label?: string;
}

export function CustomRevenueTooltip({ active, payload, label }: CustomRevenueTooltipProps): React.JSX.Element | null {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  // Extract sales and avg values from payload for this specific data point
  const salesData = payload.find((p) => p.dataKey === "sales");
  const avgData = payload.find((p) => p.dataKey === "avg");

  const sales = salesData?.value || 0;
  const avg = avgData?.value || 0;

  // Calculate percentage change for this specific data point
  // Compare current sales vs previous period average for this time slot
  let percentageChange = 0;
  if (avg > 0) {
    // Normal case: calculate percentage change vs previous period
    percentageChange = ((sales - avg) / avg) * 100;
  } else if (sales > 0) {
    // No previous period data but has current sales = 100% increase
    percentageChange = 100;
  }
  // If both are 0, percentage stays at 0
  const isPositive = percentageChange >= 0;

  // Format currency
  const formatCurrency = (value: number): string => {
    const amount = value / 100; // Convert from smallest unit (sen) to main unit (ringgit)
    return `$ ${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="rounded-lg bg-[#1F2937] px-4 py-3 shadow-lg">
      {/* Time Label */}
      <div className="mb-2 font-public text-[12px] font-medium text-white">
        {label}
      </div>

      {/* Average (previous period value for this time slot) */}
      <div className="mb-1 flex items-center justify-between gap-8">
        <span className="font-public text-[11px] font-normal text-[#9CA3AF]">Average</span>
        <span className="font-public text-[12px] font-medium text-white">{formatCurrency(avg)}</span>
      </div>

      {/* Sales */}
      <div className="mb-1 flex items-center justify-between gap-8">
        <span className="font-public text-[11px] font-normal text-[#9CA3AF]">Sales</span>
        <span className="font-public text-[12px] font-medium text-white">{formatCurrency(sales)}</span>
      </div>

      {/* Divider */}
      <div className="my-2 h-px bg-[#374151]" />

      {/* Total with Percentage */}
      <div className="flex items-center justify-between gap-8">
        <span className="font-public text-[11px] font-medium text-white">Total</span>
        <div className="flex items-center gap-2">
          <span className="font-public text-[13px] font-semibold text-white">{formatCurrency(sales)}</span>
          <span
            className={`font-public text-[11px] font-medium ${
              isPositive ? "text-[#10B981]" : "text-[#EF4444]"
            }`}
          >
            {isPositive ? "+" : ""}
            {percentageChange.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
