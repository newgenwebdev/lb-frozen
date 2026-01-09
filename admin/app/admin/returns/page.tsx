"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ReturnStatsCards, ReturnToolbar, ReturnsList, ReturnDetailsDrawer, CreateReturnDrawer, OrderSearchModal } from "@/components/admin";
import { useReturns, useReturnStats } from "@/lib/api/queries";
import { checkCanReturn } from "@/lib/api/returns";
import {
  approveReturn,
  rejectReturn,
  markReturnInTransit,
  markReturnReceived,
  completeReturn,
  processRefund,
  createReturn,
  createReplacementOrder,
} from "@/lib/api/returns";
import { useToast } from "@/contexts/ToastContext";
import { useQueryClient } from "@tanstack/react-query";
import type { Return, ReturnFilter, CreateReturnRequest, CanReturnResponse } from "@/lib/validators/return";

const RETURNS_PER_PAGE = 10;

function getErrorMessage(error: unknown): string {
  // Standard JS Error
  if (error instanceof Error) return error.message;

  // Many API libs throw objects like { message: string } or { error: string }
  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;

    // Common HTTP shape: { response: { data: { message: string } } }
    const maybeResponse = (error as { response?: unknown }).response;
    if (typeof maybeResponse === "object" && maybeResponse !== null) {
      const maybeData = (maybeResponse as { data?: unknown }).data;
      if (typeof maybeData === "object" && maybeData !== null) {
        const nestedMessage = (maybeData as { message?: unknown }).message;
        if (typeof nestedMessage === "string" && nestedMessage.trim()) return nestedMessage;
      }
    }
  }

  return "An unexpected error occurred";
}

function ReturnsPageContent(): React.JSX.Element {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [returnType, setReturnType] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [createOrderId, setCreateOrderId] = useState<string>("");
  const [canReturnData, setCanReturnData] = useState<CanReturnResponse | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isOrderSearchModalOpen, setIsOrderSearchModalOpen] = useState(false);
  const [isCheckingOrderId, setIsCheckingOrderId] = useState(false);

  // Handle create_for query parameter from OrderDetailsDrawer
  useEffect(() => {
    const createForOrderId = searchParams.get("create_for");
    if (createForOrderId) {
      // Clear the query parameter from URL
      router.replace("/admin/returns", { scroll: false });

      // Fetch can-return data and open drawer
      checkCanReturn(createForOrderId)
        .then((data) => {
          if (!data.can_return) {
            showToast(data.reason || "This order cannot be returned", "error");
            return;
          }
          setCanReturnData(data);
          setCreateOrderId(createForOrderId);
          setIsCreateDrawerOpen(true);
        })
        .catch((err) => {
          console.error("Failed to check return eligibility:", err);
          showToast("Failed to check return eligibility", "error");
        });
    }
  }, [searchParams, router, showToast]);

  // Calculate offset for pagination
  const offset = (currentPage - 1) * RETURNS_PER_PAGE;

  // Fetch return stats from API
  const { data: statsData, isLoading: isLoadingStats } = useReturnStats();

  // Fetch returns from API with filters
  const { data: returnsData, isLoading: isLoadingReturns } = useReturns({
    search: searchQuery || undefined,
    status: filterBy !== "all" ? (filterBy as ReturnFilter["status"]) : undefined,
    return_type: returnType !== "all" ? (returnType as ReturnFilter["return_type"]) : undefined,
    date_range: dateRange !== "all" ? (dateRange as ReturnFilter["date_range"]) : undefined,
    limit: RETURNS_PER_PAGE,
    offset,
  });

  // Calculate pagination
  const totalReturns = returnsData?.count || 0;
  const totalPages = Math.ceil(totalReturns / RETURNS_PER_PAGE);
  const returns = returnsData?.returns || [];

  // Handle filter changes (reset to page 1)
  const handleSearchChange = (value: string): void => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string): void => {
    setFilterBy(value);
    setCurrentPage(1);
  };

  const handleReturnTypeChange = (value: string): void => {
    setReturnType(value);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (value: string): void => {
    setDateRange(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewDetails = (returnItem: Return): void => {
    setSelectedReturn(returnItem);
    setIsDetailsDrawerOpen(true);
  };

  const handleCloseDetailsDrawer = (): void => {
    setIsDetailsDrawerOpen(false);
    setSelectedReturn(null);
  };

  const handleApprove = async (returnId: string): Promise<void> => {
    try {
      await approveReturn(returnId);
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["returns", "stats"] });
      showToast("Return request approved", "success");
      handleCloseDetailsDrawer();
    } catch (error) {
      console.error("Failed to approve return:", error);
      showToast("Failed to approve return", "error");
    }
  };

  const handleReject = async (returnId: string, reason: string): Promise<void> => {
    try {
      await rejectReturn(returnId, { rejection_reason: reason });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["returns", "stats"] });
      showToast("Return request rejected", "success");
      handleCloseDetailsDrawer();
    } catch (error) {
      console.error("Failed to reject return:", error);
      showToast("Failed to reject return", "error");
    }
  };

  const handleMarkInTransit = async (returnId: string, courier: string, trackingNumber: string): Promise<void> => {
    try {
      await markReturnInTransit(returnId, { courier, tracking_number: trackingNumber });
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["returns", "stats"] });
      showToast("Return marked as in transit", "success");
      handleCloseDetailsDrawer();
    } catch (error) {
      console.error("Failed to mark return in transit:", error);
      showToast("Failed to update return status", "error");
    }
  };

  const handleMarkReceived = async (returnId: string): Promise<void> => {
    try {
      await markReturnReceived(returnId);
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["returns", "stats"] });
      showToast("Return marked as received", "success");
      handleCloseDetailsDrawer();
    } catch (error) {
      console.error("Failed to mark return received:", error);
      showToast("Failed to update return status", "error");
    }
  };

  const handleComplete = async (returnId: string): Promise<void> => {
    try {
      await completeReturn(returnId);
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["returns", "stats"] });
      showToast("Return completed", "success");
      handleCloseDetailsDrawer();
    } catch (error) {
      console.error("Failed to complete return:", error);
      showToast("Failed to complete return", "error");
    }
  };

  const handleProcessRefund = async (returnId: string): Promise<void> => {
    try {
      showToast("Processing refund...", "info");
      const result = await processRefund(returnId);
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["returns", "stats"] });

      // Build success message including points info if applicable
      let successMessage = "Refund processed successfully";
      if (result.points) {
        const pointsParts: string[] = [];
        if (result.points.points_deducted > 0) {
          pointsParts.push(`${result.points.points_deducted} points deducted`);
        }
        if (result.points.points_restored > 0) {
          pointsParts.push(`${result.points.points_restored} points restored`);
        }
        if (pointsParts.length > 0) {
          successMessage += ` (${pointsParts.join(", ")})`;
        }
      }

      showToast(successMessage, "success");
      handleCloseDetailsDrawer();
    } catch (error: unknown) {
      console.error("Failed to process refund:", error);
      showToast(getErrorMessage(error) ||"Failed to process refund", "error");
    }
  };

  const handleCreateReplacementOrder = async (returnId: string): Promise<void> => {
    try {
      showToast("Creating replacement order...", "info");
      const result = await createReplacementOrder(returnId);
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["returns", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });

      showToast(
        `Replacement order #${result.replacement_order.display_id} created successfully`,
        "success"
      );
      handleCloseDetailsDrawer();
    } catch (error: unknown) {
      console.error("Failed to create replacement order:", error);
      showToast(getErrorMessage(error) || "Failed to create replacement order", "error");
    }
  };

  const handleCreateReturn = (): void => {
    // Open the order search modal
    setIsOrderSearchModalOpen(true);
  };

  const handleOrderSelected = async (orderId: string): Promise<void> => {
    setIsCheckingOrderId(true);
    try {
      const data = await checkCanReturn(orderId);
      if (!data.can_return) {
        showToast(data.reason || "This order cannot be returned", "error");
        return;
      }
      setCanReturnData(data);
      setCreateOrderId(orderId);
      setIsCreateDrawerOpen(true);
    } catch (err) {
      console.error("Failed to check return eligibility:", err);
      showToast("Failed to check return eligibility for this order.", "error");
    } finally {
      setIsCheckingOrderId(false);
    }
  };

  const handleCloseOrderSearchModal = (): void => {
    setIsOrderSearchModalOpen(false);
  };

  const handleSubmitCreateReturn = async (data: CreateReturnRequest): Promise<void> => {
    setIsCreating(true);
    try {
      await createReturn(data);
      queryClient.invalidateQueries({ queryKey: ["returns"] });
      queryClient.invalidateQueries({ queryKey: ["returns", "stats"] });
      showToast("Return request created", "success");
      setIsCreateDrawerOpen(false);
      setCanReturnData(null);
      setCreateOrderId("");
    } catch (error: unknown) {
      console.error("Failed to create return:", error);
      showToast(getErrorMessage(error) || "Failed to create return", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseCreateDrawer = (): void => {
    setIsCreateDrawerOpen(false);
    setCanReturnData(null);
    setCreateOrderId("");
  };

  return (
    <div className="px-4 md:px-8">
      {/* Stats Cards */}
      <ReturnStatsCards stats={statsData} isLoading={isLoadingStats} />

      {/* Returns Section */}
      <div>
        <h2 className="mb-4 font-geist text-[20px] font-medium leading-[120%] tracking-[-0.4px] text-[#030712] md:mb-6">
          Returns & Refunds
        </h2>

        {/* Toolbar */}
        <ReturnToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          filterBy={filterBy}
          onFilterChange={handleFilterChange}
          returnType={returnType}
          onReturnTypeChange={handleReturnTypeChange}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          onCreateReturn={handleCreateReturn}
        />

        {/* Returns List */}
        <ReturnsList
          returns={returns}
          isLoading={isLoadingReturns}
          currentPage={currentPage}
          totalPages={totalPages}
          totalReturns={totalReturns}
          returnsPerPage={RETURNS_PER_PAGE}
          onPageChange={handlePageChange}
          onViewDetails={handleViewDetails}
        />
      </div>

      {/* Return Details Drawer */}
      <ReturnDetailsDrawer
        isOpen={isDetailsDrawerOpen}
        onClose={handleCloseDetailsDrawer}
        returnItem={selectedReturn}
        onApprove={handleApprove}
        onReject={handleReject}
        onMarkInTransit={handleMarkInTransit}
        onMarkReceived={handleMarkReceived}
        onComplete={handleComplete}
        onProcessRefund={handleProcessRefund}
        onCreateReplacement={handleCreateReplacementOrder}
      />

      {/* Create Return Drawer */}
      <CreateReturnDrawer
        isOpen={isCreateDrawerOpen}
        onClose={handleCloseCreateDrawer}
        canReturnData={canReturnData}
        orderId={createOrderId}
        onSubmit={handleSubmitCreateReturn}
        isSubmitting={isCreating}
      />

      {/* Order Search Modal */}
      <OrderSearchModal
        isOpen={isOrderSearchModalOpen}
        onClose={handleCloseOrderSearchModal}
        onSelectOrder={handleOrderSelected}
        title="Create Return Request"
        description="Search for an order by order number, customer name, or email."
      />
    </div>
  );
}

function ReturnsPageLoading(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E5E7EB] border-t-[#030712]" />
        <p className="font-geist text-[14px] text-[#6B7280]">Loading returns...</p>
      </div>
    </div>
  );
}

export default function ReturnsPage(): React.JSX.Element {
  return (
    <Suspense fallback={<ReturnsPageLoading />}>
      <ReturnsPageContent />
    </Suspense>
  );
}
