"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMember } from "@/lib/api/queries";
import type {
  PointsTransaction,
  PointsTransactionType,
} from "@/lib/types/membership";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPoints(points: number): string {
  return points.toLocaleString();
}

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  const isActive = status === "active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-public text-[14px] font-medium ${
        isActive ? "bg-[#DEF7EC] text-[#03543F]" : "bg-[#FEE2E2] text-[#991B1B]"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isActive ? "bg-[#10B981]" : "bg-[#EF4444]"
        }`}
      />
      {isActive ? "Active" : "Cancelled"}
    </span>
  );
}

function TierBadge({ tier }: { tier: string | undefined }): React.JSX.Element {
  // Define tier colors based on tier slug
  const getTierStyles = (tierSlug: string): { bg: string; text: string } => {
    switch (tierSlug?.toLowerCase()) {
      case "platinum":
        return { bg: "bg-[#1F2937]", text: "text-white" };
      case "gold":
        return { bg: "bg-[#FEF3C7]", text: "text-[#92400E]" };
      case "silver":
        return { bg: "bg-[#E5E7EB]", text: "text-[#374151]" };
      case "classic":
      default:
        return { bg: "bg-[#F3E8FF]", text: "text-[#6B21A8]" };
    }
  };

  const tierSlug = tier || "classic";
  const styles = getTierStyles(tierSlug);
  const displayName = tierSlug.charAt(0).toUpperCase() + tierSlug.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 font-public text-[14px] font-medium ${styles.bg} ${styles.text}`}
    >
      {displayName}
    </span>
  );
}

function TransactionTypeBadge({
  type,
}: {
  type: PointsTransactionType;
}): React.JSX.Element {
  const styles: Record<PointsTransactionType, string> = {
    earn: "bg-[#DEF7EC] text-[#03543F]",
    redeem: "bg-[#DBEAFE] text-[#1E40AF]",
    adjust: "bg-[#FEF3C7] text-[#92400E]",
    expire: "bg-[#FEE2E2] text-[#991B1B]",
  };

  const labels: Record<PointsTransactionType, string> = {
    earn: "Earned",
    redeem: "Redeemed",
    adjust: "Adjustment",
    expire: "Expired",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-public text-[12px] font-medium ${styles[type]}`}
    >
      {labels[type]}
    </span>
  );
}

function TransactionAmountDisplay({
  type,
  amount,
}: {
  type: PointsTransactionType;
  amount: number;
}): React.JSX.Element {
  const isPositive = type === "earn" || (type === "adjust" && amount > 0);
  const prefix = isPositive ? "+" : "-";
  const displayAmount = Math.abs(amount);

  return (
    <span
      className={`font-public text-[14px] font-medium ${
        isPositive ? "text-[#03543F]" : "text-[#991B1B]"
      }`}
    >
      {prefix}
      {formatPoints(displayAmount)}
    </span>
  );
}

export default function MemberDetailPage(): React.JSX.Element {
  const params = useParams();
  const customerId = params.id as string;

  const { data: memberData, isLoading, error } = useMember(customerId);

  if (isLoading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center px-4 md:px-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#030712] border-t-transparent"></div>
          <p className="font-public text-[14px] text-[#6A7282]">
            Loading member details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !memberData) {
    return (
      <div className="flex min-h-[600px] items-center justify-center px-4 md:px-8">
        <div className="text-center">
          <div className="mb-4 text-[48px]">👤</div>
          <h3 className="mb-2 font-geist text-[18px] font-medium text-[#030712]">
            Member not found
          </h3>
          <p className="mb-6 font-public text-[14px] text-[#6A7282]">
            The member you&apos;re looking for doesn&apos;t exist or is not a member
          </p>
          <Link
            href="/admin/membership"
            className="inline-flex items-center gap-2 rounded-lg bg-[#030712] px-4 py-2 font-public text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937]"
          >
            Back to Members
          </Link>
        </div>
      </div>
    );
  }

  const { membership, customer, points, recent_transactions } = memberData;

  const customerName =
    customer.first_name || customer.last_name
      ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
      : customer.email;

  return (
    <div className="px-4 pb-8 md:px-8">
      {/* Back Button */}
      <Link
        href="/admin/membership"
        className="mb-6 inline-flex items-center gap-2 font-public text-[14px] text-[#6A7282] transition-colors hover:text-[#030712]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Members
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-2 font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          {customerName}
        </h1>
        <p className="font-public text-[14px] text-[#6A7282]">
          Member since {formatDate(membership.activated_at)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Points Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
              <p className="mb-2 font-public text-[14px] text-[#6A7282]">
                Current Balance
              </p>
              <p className="font-geist text-[28px] font-medium text-[#030712]">
                {points ? formatPoints(points.balance) : "0"}
              </p>
            </div>
            <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
              <p className="mb-2 font-public text-[14px] text-[#6A7282]">
                Total Earned
              </p>
              <p className="font-geist text-[28px] font-medium text-[#03543F]">
                {points ? formatPoints(points.total_earned) : "0"}
              </p>
            </div>
            <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
              <p className="mb-2 font-public text-[14px] text-[#6A7282]">
                Total Redeemed
              </p>
              <p className="font-geist text-[28px] font-medium text-[#1E40AF]">
                {points ? formatPoints(points.total_redeemed) : "0"}
              </p>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
            <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
              Recent Transactions
            </h2>
            {recent_transactions && recent_transactions.length > 0 ? (
              <div className="space-y-4">
                {recent_transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between border-b border-[#E8E8E9] pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <TransactionTypeBadge type={transaction.type} />
                      <div>
                        <p className="font-public text-[14px] font-medium text-[#030712]">
                          {transaction.reason ||
                            getDefaultTransactionLabel(transaction.type)}
                        </p>
                        <p className="font-public text-[12px] text-[#6A7282]">
                          {formatDateTime(transaction.created_at)}
                          {transaction.order_id && (
                            <span className="ml-2">
                              • Order #{transaction.order_id.slice(-8)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <TransactionAmountDisplay
                        type={transaction.type}
                        amount={transaction.amount}
                      />
                      <p className="font-public text-[12px] text-[#6A7282]">
                        Balance: {formatPoints(transaction.balance_after)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="font-public text-[14px] text-[#6A7282]">
                  No transactions yet
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-1">
          {/* Membership Status */}
          <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
            <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
              Membership
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-public text-[14px] text-[#6A7282]">
                  Status
                </span>
                <StatusBadge status={membership.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-public text-[14px] text-[#6A7282]">
                  Tier
                </span>
                <TierBadge tier={membership.tier_slug} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-public text-[14px] text-[#6A7282]">
                  Activated
                </span>
                <span className="font-public text-[14px] text-[#030712]">
                  {formatDate(membership.activated_at)}
                </span>
              </div>
              {membership.stripe_payment_id && (
                <div className="flex items-center justify-between">
                  <span className="font-public text-[14px] text-[#6A7282]">
                    Payment ID
                  </span>
                  <span className="font-mono text-[12px] text-[#6A7282]">
                    {membership.stripe_payment_id.slice(-12)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="rounded-xl border border-[#E8E8E9] bg-white p-6">
            <h2 className="mb-4 font-geist text-[18px] font-medium text-[#030712]">
              Customer
            </h2>
            <div className="space-y-3">
              <div>
                <p className="mb-1 font-public text-[12px] text-[#6A7282]">
                  Name
                </p>
                <p className="font-public text-[14px] text-[#030712]">
                  {customerName}
                </p>
              </div>
              <div>
                <p className="mb-1 font-public text-[12px] text-[#6A7282]">
                  Email
                </p>
                <p className="font-public text-[14px] text-[#030712]">
                  {customer.email}
                </p>
              </div>
              {customer.phone && (
                <div>
                  <p className="mb-1 font-public text-[12px] text-[#6A7282]">
                    Phone
                  </p>
                  <p className="font-public text-[14px] text-[#030712]">
                    {customer.phone}
                  </p>
                </div>
              )}
              <div>
                <p className="mb-1 font-public text-[12px] text-[#6A7282]">
                  Account Status
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 font-public text-[12px] font-medium ${
                    customer.has_account
                      ? "bg-[#DEF7EC] text-[#03543F]"
                      : "bg-[#F3F4F6] text-[#374151]"
                  }`}
                >
                  {customer.has_account ? "Has Account" : "Guest"}
                </span>
              </div>
              <div>
                <p className="mb-1 font-public text-[12px] text-[#6A7282]">
                  Customer Since
                </p>
                <p className="font-public text-[14px] text-[#030712]">
                  {formatDate(customer.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDefaultTransactionLabel(type: PointsTransactionType): string {
  const labels: Record<PointsTransactionType, string> = {
    earn: "Points earned from purchase",
    redeem: "Points redeemed for discount",
    adjust: "Manual adjustment",
    expire: "Points expired",
  };
  return labels[type];
}
