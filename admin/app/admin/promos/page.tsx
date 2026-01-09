"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PromoStatsCards,
  PromoToolbar,
  PromoTable,
  PWPRulesTable,
  PromoPagination,
} from "@/components/admin/promo";
import type { Coupon, PWPRule, PromoTab } from "@/lib/types/promo";
import type { CouponSortField, SortDirection } from "@/components/admin/promo/PromoTable";
import type { PWPSortField } from "@/components/admin/promo/PWPRulesTable";
import { usePromoStats, useCoupons, usePWPRules } from "@/lib/api/queries";
import { useDeleteCoupon, useDeletePWPRule } from "@/lib/api/mutations";
import { transformCouponForDisplay, transformPWPRuleForDisplay } from "@/lib/api/promos";
import { useToast } from "@/contexts/ToastContext";

const ITEMS_PER_PAGE = 10;

export default function PromosPage(): React.JSX.Element {
  const router = useRouter();
  const { confirm } = useToast();
  const [activeTab, setActiveTab] = useState<PromoTab>("coupons");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  // Column sorting state for coupons
  const [couponSortField, setCouponSortField] = useState<CouponSortField | undefined>(undefined);
  const [couponSortDirection, setCouponSortDirection] = useState<SortDirection>("desc");

  // Column sorting state for PWP rules
  const [pwpSortField, setPwpSortField] = useState<PWPSortField | undefined>(undefined);
  const [pwpSortDirection, setPwpSortDirection] = useState<SortDirection>("desc");

  // API queries - fetch all items for client-side sorting to work correctly
  // Using high limit since promo datasets are typically small
  const { data: statsData, isLoading: isLoadingStats } = usePromoStats();
  const { data: couponsData, isLoading: isLoadingCoupons } = useCoupons({
    q: searchQuery || undefined,
    limit: 1000,
    offset: 0,
  });
  const { data: pwpRulesData, isLoading: isLoadingPWPRules } = usePWPRules({
    q: searchQuery || undefined,
    limit: 1000,
    offset: 0,
  });

  // Mutations
  const deleteCouponMutation = useDeleteCoupon();
  const deletePWPRuleMutation = useDeletePWPRule();

  // Transform API data to display format
  const coupons: Coupon[] = useMemo(() => {
    if (!couponsData?.coupons) return [];
    return couponsData.coupons.map(transformCouponForDisplay);
  }, [couponsData]);

  const pwpRules: PWPRule[] = useMemo(() => {
    if (!pwpRulesData?.pwp_rules) return [];
    return pwpRulesData.pwp_rules.map(transformPWPRuleForDisplay);
  }, [pwpRulesData]);

  // Default stats
  const stats = statsData ?? {
    totalPromo: 0,
    activePromo: 0,
    redemptionCoupons: 0,
  };

  // Filter and sort coupons
  const filteredCoupons = useMemo(() => {
    const result = [...coupons];

    // Column sort
    if (couponSortField) {
      result.sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";

        switch (couponSortField) {
          case "displayId":
            aVal = a.displayId;
            bVal = b.displayId;
            break;
          case "code":
            aVal = a.code;
            bVal = b.code;
            break;
          case "type":
            aVal = a.type;
            bVal = b.type;
            break;
          case "value":
            aVal = a.value;
            bVal = b.value;
            break;
          case "status":
            aVal = a.status;
            bVal = b.status;
            break;
        }

        if (typeof aVal === "string" && typeof bVal === "string") {
          return couponSortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return 0;
      });
    } else {
      // Toolbar sort
      switch (sortBy) {
        case "oldest":
          result.reverse();
          break;
        case "code_asc":
          result.sort((a, b) => a.code.localeCompare(b.code));
          break;
        case "code_desc":
          result.sort((a, b) => b.code.localeCompare(a.code));
          break;
        default:
          // newest - keep original order
          break;
      }
    }

    return result;
  }, [coupons, sortBy, couponSortField, couponSortDirection]);

  // Filter and sort PWP rules
  const filteredPWPRules = useMemo(() => {
    const result = [...pwpRules];

    // Column sort
    if (pwpSortField) {
      result.sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";

        switch (pwpSortField) {
          case "displayId":
            aVal = a.displayId;
            bVal = b.displayId;
            break;
          case "rule":
            aVal = a.rule;
            bVal = b.rule;
            break;
          case "date":
            aVal = a.startDate;
            bVal = b.startDate;
            break;
          case "redemptions":
            aVal = a.redemptions;
            bVal = b.redemptions;
            break;
          case "status":
            aVal = a.status;
            bVal = b.status;
            break;
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return pwpSortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
        if (typeof aVal === "string" && typeof bVal === "string") {
          return pwpSortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return 0;
      });
    } else {
      // Toolbar sort
      switch (sortBy) {
        case "oldest":
          result.reverse();
          break;
        case "code_asc":
          result.sort((a, b) => a.rule.localeCompare(b.rule));
          break;
        case "code_desc":
          result.sort((a, b) => b.rule.localeCompare(a.rule));
          break;
        default:
          // newest - keep original order
          break;
      }
    }

    return result;
  }, [pwpRules, sortBy, pwpSortField, pwpSortDirection]);

  // Get current data based on active tab
  const currentData = activeTab === "coupons" ? filteredCoupons : filteredPWPRules;

  // Calculate pagination
  const totalItems = currentData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Get paginated coupons
  const paginatedCoupons = useMemo(() => {
    return filteredCoupons.slice(startIndex, endIndex);
  }, [filteredCoupons, startIndex, endIndex]);

  // Get paginated PWP rules
  const paginatedPWPRules = useMemo(() => {
    return filteredPWPRules.slice(startIndex, endIndex);
  }, [filteredPWPRules, startIndex, endIndex]);

  // Handle tab change
  const handleTabChange = (tab: PromoTab): void => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchQuery("");
    // Reset column sorting
    setCouponSortField(undefined);
    setPwpSortField(undefined);
  };

  // Handle search change
  const handleSearchChange = (query: string): void => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Handle toolbar sort change
  const handleSortChange = (sort: string): void => {
    setSortBy(sort);
    setCurrentPage(1);
    // Reset column sorting when using toolbar sort
    setCouponSortField(undefined);
    setPwpSortField(undefined);
  };

  // Handle coupon column sort
  const handleCouponSort = (field: CouponSortField): void => {
    if (couponSortField === field) {
      // Toggle direction
      setCouponSortDirection(couponSortDirection === "asc" ? "desc" : "asc");
    } else {
      setCouponSortField(field);
      setCouponSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Handle PWP column sort
  const handlePWPSort = (field: PWPSortField): void => {
    if (pwpSortField === field) {
      // Toggle direction
      setPwpSortDirection(pwpSortDirection === "asc" ? "desc" : "asc");
    } else {
      setPwpSortField(field);
      setPwpSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number): void => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Handle filter click
  const handleFilterClick = (): void => {
    // TODO: Implement filter functionality
    console.log("Filter clicked");
  };

  // Handle add new promo click
  const handleAddClick = (): void => {
    if (activeTab === "coupons") {
      router.push("/admin/promos/add?type=coupon");
    } else {
      router.push("/admin/promos/add?type=pwp");
    }
  };

  // Handle edit
  const handleEdit = (id: string): void => {
    if (activeTab === "coupons") {
      router.push(`/admin/promos/edit/${id}?type=coupon`);
    } else {
      router.push(`/admin/promos/edit/${id}?type=pwp`);
    }
  };

  // Handle delete
  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await confirm({
      title: "Delete Promo",
      message: "Are you sure you want to delete this promo?",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });

    if (confirmed) {
      if (activeTab === "coupons") {
        deleteCouponMutation.mutate(id);
      } else {
        deletePWPRuleMutation.mutate(id);
      }
    }
  };

  const isLoading = activeTab === "coupons" ? isLoadingCoupons : isLoadingPWPRules;

  return (
    <div className="px-4 md:px-8">
      {/* Stats Cards */}
      <PromoStatsCards stats={stats} isLoading={isLoadingStats} />

      {/* Toolbar with Tabs */}
      <PromoToolbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        onFilterClick={handleFilterClick}
        onAddClick={handleAddClick}
      />

      {/* Table */}
      {activeTab === "coupons" && (
        <PromoTable
          coupons={paginatedCoupons}
          isLoading={isLoading}
          sortField={couponSortField}
          sortDirection={couponSortDirection}
          onSort={handleCouponSort}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {activeTab === "pwp-rules" && (
        <PWPRulesTable
          rules={paginatedPWPRules}
          isLoading={isLoading}
          sortField={pwpSortField}
          sortDirection={pwpSortDirection}
          onSort={handlePWPSort}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Pagination */}
      {totalPages > 0 && (
        <PromoPagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  );
}
