"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MembershipPromoTable,
  MembershipPromoToolbar,
  MembershipPromoPagination,
} from "@/components/admin/membership";
import { useMembershipPromos } from "@/lib/api/queries";
import { useToggleMembershipPromoStatus, useDeleteMembershipPromo } from "@/lib/api/mutations";
import { transformPromoForDisplay } from "@/lib/api/membership-promos";
import { useToast } from "@/contexts/ToastContext";
import type { MembershipPromo } from "@/lib/types/membership";
import type { MembershipPromoSortField, SortDirection } from "@/components/admin/membership/MembershipPromoTable";

type StatusFilter = "active" | "non-active" | "all";

export default function MembershipPromosPage(): React.JSX.Element {
  const router = useRouter();
  const { confirm, showToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<MembershipPromoSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Calculate offset for API pagination
  const offset = (currentPage - 1) * itemsPerPage;

  // Fetch promos from API with status filter
  const { data, isLoading, error } = useMembershipPromos({
    limit: itemsPerPage,
    offset,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  // Mutations
  const toggleStatusMutation = useToggleMembershipPromoStatus();
  const deleteMutation = useDeleteMembershipPromo();

  // Transform API promos to display format, apply client-side search and sort
  const displayPromos: MembershipPromo[] = useMemo(() => {
    if (!data?.promos) return [];
    let promos = data.promos.map(transformPromoForDisplay);

    // Apply client-side search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      promos = promos.filter((promo) =>
        promo.name.toLowerCase().includes(searchLower) ||
        promo.displayId.toLowerCase().includes(searchLower)
      );
    }

    // Apply client-side sorting
    if (sortField) {
      promos = [...promos].sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";

        switch (sortField) {
          case "displayId":
            aVal = a.displayId;
            bVal = b.displayId;
            break;
          case "name":
            aVal = a.name;
            bVal = b.name;
            break;
          case "period":
            aVal = a.period;
            bVal = b.period;
            break;
          case "status":
            aVal = a.status;
            bVal = b.status;
            break;
        }

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return 0;
      });
    }

    return promos;
  }, [data?.promos, debouncedSearch, sortField, sortDirection]);

  // Calculate pagination
  const totalPromos = data?.count ?? 0;
  const totalPages = Math.ceil(totalPromos / itemsPerPage);

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

  // Handle toggle status
  const handleToggleStatus = (id: string, newStatus: boolean): void => {
    toggleStatusMutation.mutate({
      id,
      status: newStatus ? "active" : "non-active",
    });
  };

  // Handle search change
  const handleSearchChange = (value: string): void => {
    setSearchQuery(value);
  };

  // Handle filter change
  const handleFilterChange = (value: StatusFilter): void => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  // Handle sort
  const handleSort = (field: MembershipPromoSortField, direction: SortDirection): void => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Handle add new promo click
  const handleAddClick = (): void => {
    router.push("/admin/membership/promos/add");
  };

  // Handle edit
  const handleEdit = (id: string): void => {
    router.push(`/admin/membership/promos/edit/${id}`);
  };

  // Handle delete
  const handleDelete = async (id: string): Promise<void> => {
    const confirmed = await confirm({
      title: "Delete Membership Promo",
      message: "Are you sure you want to delete this membership promo? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
    });

    if (confirmed) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          showToast("Membership promo deleted successfully", "success");
        },
        onError: (error) => {
          showToast(error.message || "Failed to delete membership promo", "error");
        },
      });
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="px-4 md:px-8">
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="text-red-500">Failed to load membership promos</p>
            <p className="mt-2 text-sm text-gray-500">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8">
      {/* Toolbar */}
      <MembershipPromoToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onFilterChange={handleFilterChange}
        onAddClick={handleAddClick}
      />

      {/* Table */}
      <MembershipPromoTable
        promos={displayPromos}
        isLoading={isLoading}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onToggleStatus={handleToggleStatus}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {totalPages > 0 && (
        <MembershipPromoPagination
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
