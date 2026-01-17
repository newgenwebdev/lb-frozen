"use client";

import React, { useState, useCallback } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { Button, Card, DropdownMenu, ComparisonDisplay, TrendIcon, ExportSalesModal } from "@/components/ui";
import { StatCard, RecentOrdersTable, TopSellingProductsTable, CustomRevenueTooltip } from "@/components/admin";
import { useRevenue, useCustomers, useRevenueTimeseries, useRecentOrders, useTopSellingProducts } from "@/lib/api/queries";
import { exportSalesCSV, type TopProductsSortBy } from "@/lib/api/analytics";
import { DATE_FILTER_OPTIONS, TOP_PRODUCTS_LIMIT } from "@/lib/constants";
import { getComparisonText, getPeriodLabel } from "@/lib/utils/overview";

// Valid date filter periods - used for client-side validation
const VALID_PERIODS = ["today", "yesterday", "7days", "month", "year"] as const;
type DateFilterPeriod = typeof VALID_PERIODS[number];

// Type guard to validate period values
function isValidPeriod(value: string): value is DateFilterPeriod {
  return VALID_PERIODS.includes(value as DateFilterPeriod);
}

export default function OverviewPage(): React.JSX.Element {
  const [dateFilter, setDateFilter] = useState<DateFilterPeriod>("today");
  const [topProductsSortBy, setTopProductsSortBy] = useState<TopProductsSortBy>("revenue");

  // Validated date filter change handler
  const handleDateFilterChange = useCallback((value: string): void => {
    if (isValidPeriod(value)) {
      setDateFilter(value);
    }
  }, []);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch analytics data from API
  const { data: revenueData, isLoading: isLoadingRevenue, error: revenueError } = useRevenue(dateFilter);
  const { data: customerData, isLoading: isLoadingCustomers, error: customerError } = useCustomers(dateFilter);
  const { data: timeseriesData, isLoading: isLoadingTimeseries, error: timeseriesError } = useRevenueTimeseries(dateFilter);
  const { data: recentOrdersData, isLoading: isLoadingRecentOrders } = useRecentOrders(100);
  const { data: topSellingProductsData, isLoading: isLoadingTopProducts } = useTopSellingProducts(dateFilter, TOP_PRODUCTS_LIMIT, topProductsSortBy);

  // Use real timeseries data or fallback to empty array
  const chartData = timeseriesData?.timeseries.data || [];
  const ordersData = recentOrdersData?.orders || [];
  const topProductsData = topSellingProductsData?.products || [];

  // Calculate dynamic Y-axis domain based on actual data
  const maxValue = chartData.length > 0
    ? Math.max(...chartData.map((d) => Math.max(d.sales || 0, d.avg || 0)), 200000)
    : 200000;

  // Determine appropriate step size based on max value
  const getStepSize = (max: number): number => {
    if (max <= 200000) return 50000;
    if (max <= 500000) return 100000;
    if (max <= 1000000) return 250000;
    if (max <= 5000000) return 1000000;
    return Math.ceil(max / 5 / 1000000) * 1000000; // For very large values, round to millions
  };

  const stepSize = getStepSize(maxValue);
  const yAxisMax = Math.ceil(maxValue * 1.2 / stepSize) * stepSize; // Round up with 20% padding
  const yAxisStep = yAxisMax / 4; // Divide into 4 equal steps
  const yAxisTicks = [0, yAxisStep, yAxisStep * 2, yAxisStep * 3, yAxisMax]; // Generate 5 ticks from 0 to max

  // Handle export sales data
  const handleExport = useCallback(async (params: {
    startDate: string | null;
    endDate: string | null;
    columns: string[];
  }): Promise<void> => {
    setIsExporting(true);
    let blobUrl: string | null = null;

    try {
      const blob = await exportSalesCSV(params);

      // Create download link
      blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().split("T")[0];
      a.href = blobUrl;
      a.download = `sales-report_${today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setIsExportModalOpen(false);
    } catch (error) {
      // Log detailed error only in development
      if (process.env.NODE_ENV === "development") {
        console.error("Export failed:", error);
      }
      // TODO: In production, consider sending to error monitoring service (e.g., Sentry)
    } finally {
      // Always cleanup blob URL to prevent memory leaks
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
      setIsExporting(false);
    }
  }, []);

  return (
    <div className="px-4 md:px-8">
      {/* Total Earning */}
      <div className="mb-6 rounded-lg bg-white p-4 md:mb-8 md:p-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h3 className="mb-1 font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#030712]">
              Total Earning
            </h3>
            <div className="flex items-end gap-3">
              {isLoadingRevenue ? (
                <p className="font-geist text-[36px] font-medium leading-[120%] tracking-[-0.72px] text-[#6A7282]">Loading...</p>
              ) : revenueError ? (
                <div className="flex flex-col">
                  <p className="font-geist text-[36px] font-medium leading-[120%] tracking-[-0.72px] text-[#DC2626]">Error</p>
                  <p className="font-public text-[12px] text-[#DC2626]">Failed to load revenue data. Please try again.</p>
                </div>
              ) : (
                <p className="font-geist text-[36px] font-medium leading-[120%] tracking-[-0.72px] text-[#030712]">
                  ${" "}
                  {(revenueData?.revenue.total ? revenueData.revenue.total / 100 : 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
              {!isLoadingRevenue && !revenueError && revenueData && (
                <div className="flex items-center gap-1 pb-1">
                  <TrendIcon direction={revenueData.revenue.change_direction} size={16} />
                  <span
                    className={`font-public text-[14px] font-medium tracking-[-0.14px] ${
                      revenueData.revenue.change_direction === "up"
                        ? "text-[#049228]"
                        : revenueData.revenue.change_direction === "down"
                        ? "text-[#DC2626]"
                        : "text-[#6A7282]"
                    }`}
                  >
                    {revenueData.revenue.change_percent.toFixed(1)}%
                  </span>
                  <span className="font-public text-[14px] font-medium tracking-[-0.14px] text-[#6A7282]">
                    {getComparisonText(dateFilter)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center md:w-auto">
            <DropdownMenu
              items={[...DATE_FILTER_OPTIONS]}
              value={dateFilter}
              onChange={handleDateFilterChange}
              title="Date Selected"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10.6673 1.3335V4.00016" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5.33333 1.3335V4.00016" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 5.99984H14" stroke="#030712" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12.6667 2.66699H3.33333C2.59667 2.66699 2 3.26366 2 4.00033V12.667C2 13.4037 2.59667 14.0003 3.33333 14.0003H12.6667C13.4033 14.0003 14 13.4037 14 12.667V4.00033C14 3.26366 13.4033 2.66699 12.6667 2.66699Z"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4.67447 8.486C4.58247 8.486 4.5078 8.56067 4.50847 8.65267C4.50847 8.74467 4.58313 8.81934 4.67513 8.81934C4.76713 8.81934 4.8418 8.74467 4.8418 8.65267C4.8418 8.56067 4.76713 8.486 4.67447 8.486"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.00845 8.486C7.91645 8.486 7.84178 8.56067 7.84245 8.65267C7.84245 8.74467 7.91712 8.81934 8.00912 8.81934C8.10112 8.81934 8.17578 8.74467 8.17578 8.65267C8.17578 8.56067 8.10112 8.486 8.00845 8.486"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M11.3424 8.486C11.2504 8.486 11.1758 8.56067 11.1764 8.65267C11.1764 8.74467 11.2511 8.81934 11.3431 8.81934C11.4351 8.81934 11.5098 8.74467 11.5098 8.65267C11.5098 8.56067 11.4351 8.486 11.3424 8.486"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4.67447 11.1525C4.58247 11.1525 4.5078 11.2272 4.50847 11.3192C4.50847 11.4112 4.58313 11.4858 4.67513 11.4858C4.76713 11.4858 4.8418 11.4112 4.8418 11.3192C4.8418 11.2272 4.76713 11.1525 4.67447 11.1525"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.00845 11.1525C7.91645 11.1525 7.84178 11.2272 7.84245 11.3192C7.84245 11.4112 7.91712 11.4858 8.00912 11.4858C8.10112 11.4858 8.17578 11.4112 8.17578 11.3192C8.17578 11.2272 8.10112 11.1525 8.00845 11.1525"
                    stroke="#030712"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />

            <Button
              variant="primary"
              onClick={() => setIsExportModalOpen(true)}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M7.99935 11.3333V2" stroke="white" strokeWidth="0.833333" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.3327 13.9998H2.66602" stroke="white" strokeWidth="0.833333" strokeLinecap="round" strokeLinejoin="round" />
                  <path
                    d="M11.3333 8L7.99935 11.334L4.66602 8"
                    stroke="white"
                    strokeWidth="0.833333"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:mb-8 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        <StatCard
          title="Total sales"
          value={isLoadingRevenue ? "..." : revenueData?.revenue.orders_count.toLocaleString() || "0"}
          menuActions={[
            {
              label: "View All Orders",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              ),
              onClick: () => window.location.href = "/admin/orders",
            },
          ]}
        >
          {!isLoadingRevenue && !revenueError && revenueData && (
            <ComparisonDisplay
              changePercent={revenueData.revenue.orders_change_percent}
              changeDirection={revenueData.revenue.orders_change_direction}
              comparisonText={getComparisonText(dateFilter)}
            />
          )}
        </StatCard>
        <StatCard
          title="New Customers"
          value={isLoadingCustomers ? "..." : customerData?.customers.new_customers.toLocaleString() || "0"}
        >
          {!isLoadingCustomers && !customerError && customerData && (
            <ComparisonDisplay
              changePercent={customerData.customers.change_percent}
              changeDirection={customerData.customers.change_direction}
              comparisonText={getComparisonText(dateFilter)}
            />
          )}
        </StatCard>
        <StatCard
          title="Average Order Value"
          value={
            isLoadingRevenue
              ? "..."
              : revenueData?.revenue.average_order_value
              ? `$ ${(revenueData.revenue.average_order_value / 100).toFixed(2)}`
              : "$ 0.00"
          }
          menuActions={[
            {
              label: "View All Orders",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              ),
              onClick: () => window.location.href = "/admin/orders",
            },
          ]}
        >
          {!isLoadingRevenue && !revenueError && revenueData && (
            <div>
              <div className="flex items-center gap-2">
                <p className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#030712]">
                  {revenueData.revenue.items_per_order.toFixed(0)} Items / Order
                </p>
                <ComparisonDisplay
                  changePercent={revenueData.revenue.items_per_order_change_percent}
                  changeDirection={revenueData.revenue.items_per_order_change_direction}
                  comparisonText={getComparisonText(dateFilter)}
                />
              </div>
            </div>
          )}
        </StatCard>
      </div>

      {/* Charts & Tables Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:mb-8 md:gap-6 lg:grid-cols-3">
        {/* Profit Overview */}
        <Card
          className="lg:col-span-2"
          title={`${getPeriodLabel(dateFilter)} Profit Overview`}
          titleClassName="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#030712]"
        >
          {isLoadingTimeseries ? (
            <div className="flex h-80 items-center justify-center text-[#6A7282]">Loading chart data...</div>
          ) : timeseriesError ? (
            <div className="flex h-80 items-center justify-center text-[#DC2626]">Failed to load chart data</div>
          ) : (
            <>
              <div className="mb-6 flex items-end justify-between gap-3">
                <div className="flex items-end gap-3">
                  {isLoadingRevenue ? (
                    <p className="font-geist text-[36px] font-medium leading-[120%] tracking-[-0.72px] text-[#6A7282]">...</p>
                  ) : revenueData ? (
                    <p className="font-geist text-[36px] font-medium leading-[120%] tracking-[-0.72px] text-[#030712]">
                      ${" "}
                      {(revenueData.revenue.total / 100).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  ) : null}
                  {!isLoadingRevenue && revenueData && (
                    <ComparisonDisplay
                      changePercent={revenueData.revenue.change_percent}
                      changeDirection={revenueData.revenue.change_direction}
                      comparisonText={getComparisonText(dateFilter)}
                    />
                  )}
                </div>
                <div className="flex items-end gap-4 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-[#2C3333]"></span>
                    <span className="font-public text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">Sales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm bg-[#FFB800]"></span>
                    <span className="font-public text-[12px] font-medium tracking-[-0.12px] text-[#6A7282]">Avg</span>
                  </div>
                </div>
              </div>
              <div className="h-80 w-full min-h-80">
                <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="0" stroke="#F5F5F5" vertical={false} />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6A7282", fontSize: 10, fontFamily: "var(--font-public-sans)" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6A7282", fontSize: 10, fontFamily: "var(--font-public-sans)" }}
                      tickFormatter={(value) => `${(value / 100 / 1000).toFixed(0)}k`}
                      domain={[0, yAxisMax]}
                      ticks={yAxisTicks}
                    />
                    <Tooltip content={<CustomRevenueTooltip />} />
                    <Bar dataKey="sales" fill="#2C3333" radius={[8, 8, 0, 0]} barSize={40} />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      stroke="#FFB800"
                      strokeWidth={2}
                      dot={{ fill: "#FFB800", strokeWidth: 2, r: 4, stroke: "#fff" }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Card>

        {/* Top Selling Products */}
        <TopSellingProductsTable
          products={topProductsData}
          currency={revenueData?.revenue.currency || "usd"}
          isLoading={isLoadingTopProducts}
          sortBy={topProductsSortBy}
          onSortChange={setTopProductsSortBy}
        />
      </div>

      {/* Recent Orders */}
      <RecentOrdersTable orders={ordersData} isLoading={isLoadingRecentOrders} />

      {/* Export Sales Modal */}
      <ExportSalesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </div>
  );
}
