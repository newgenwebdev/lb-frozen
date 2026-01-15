"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ProfileSidebar from "@/components/layout/ProfileSidebar";
import { useAuthContext } from "@/lib/AuthContext";
import { AddCardDialog } from "@/components/AddCardDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getCardBrandName,
  getCardBrandGradient,
} from "@/lib/api/payment-methods";
import { usePaymentMethodsQuery, useDeletePaymentMethodMutation } from "@/lib/queries";

export default function PaymentMethodPage() {
  const router = useRouter();
  const { customer, loading: authLoading } = useAuthContext();

  // React Query for payment methods
  const { data: paymentMethods = [], isLoading: loading, refetch } = usePaymentMethodsQuery();
  const deletePaymentMethodMutation = useDeletePaymentMethodMutation();

  // Local UI state
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !customer) {
      router.push("/login");
    }
  }, [authLoading, customer, router]);

  // Get customer name for display
  const customerName = customer
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
      "User"
    : "Guest";

  // Customer email
  const customerEmail = customer?.email || "";

  // Open delete confirmation
  const openDeleteConfirm = (cardId: string) => {
    setCardToDelete(cardId);
    setDeleteConfirmOpen(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!cardToDelete) return;

    setDeletingId(cardToDelete);
    try {
      await deletePaymentMethodMutation.mutateAsync(cardToDelete);
      setDeleteConfirmOpen(false);
      setCardToDelete(null);
    } catch (error) {
      console.error("Failed to delete payment method:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle card added successfully
  const handleCardAdded = () => {
    refetch();
  };

  // Render card brand logo
  const renderCardLogo = (brand: string) => {
    const lowerBrand = brand.toLowerCase();
    if (lowerBrand === "mastercard") {
      return (
        <div className="flex gap-[-8px] mb-8">
          <div className="w-8 h-8 rounded-full bg-red-500 opacity-80"></div>
          <div className="w-8 h-8 rounded-full bg-yellow-500 opacity-80 -ml-3"></div>
        </div>
      );
    }
    if (lowerBrand === "visa") {
      return (
        <div className="mb-8">
          <span className="text-3xl font-bold italic">VISA</span>
        </div>
      );
    }
    if (lowerBrand === "amex") {
      return (
        <div className="mb-8">
          <span className="text-2xl font-bold">AMEX</span>
        </div>
      );
    }
    // Default card icon
    return (
      <div className="mb-8">
        <span className="text-xl font-bold uppercase">{brand}</span>
      </div>
    );
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!customer) {
    return null; // Will redirect
  }

  return (
    <div className="mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-8">
        <Link href="/" className="hover:text-gray-900">
          Home
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Profile & settings</span>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        {/* Left Sidebar */}
        <ProfileSidebar activeMenu="Payment method" />

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="border-t border-l border-r rounded-t-lg border-b border-gray-200 p-4 sm:p-6 mb-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Payment method
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Manage your saved cards and linked accounts for faster checkout
            </p>
          </div>

          {/* Your saved card section */}
          <div className="bg-white border-l border-r border-gray-200 p-4 sm:p-6 mb-0">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
              Your saved card ({paymentMethods.length})
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Saved Cards */}
                {paymentMethods.map((method, index) => (
                  <div
                    key={method.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div
                      className="rounded-lg p-6 mb-4 text-white relative overflow-hidden"
                      style={{
                        background: getCardBrandGradient(
                          method.card?.brand || ""
                        ),
                      }}
                    >
                      {/* Card Logo */}
                      {renderCardLogo(method.card?.brand || "")}

                      {/* Decorative Pattern */}
                      <div className="absolute top-0 right-0 w-full h-full opacity-5">
                        <div className="text-6xl font-bold">○○○○</div>
                      </div>

                      {/* Card Info */}
                      <div className="relative">
                        <p className="text-white font-medium mb-1">
                          {method.billing_details?.name || customerName}
                        </p>
                        <div className="flex justify-between items-center">
                          <p className="text-white text-sm">
                            •••• •••• •••• {method.card?.last4}
                          </p>
                          <p className="text-white text-xs">
                            Exp{" "}
                            {String(method.card?.exp_month).padStart(2, "0")}/
                            {String(method.card?.exp_year).slice(-2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm sm:text-base font-semibold text-gray-900">
                          {method.card?.funding === "credit"
                            ? "Credit"
                            : "Debit"}{" "}
                          card {index + 1}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {getCardBrandName(method.card?.brand || "")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors border border-gray-300 disabled:opacity-50"
                          onClick={() => openDeleteConfirm(method.id)}
                          disabled={deletingId === method.id}
                        >
                          {deletingId === method.id ? (
                            <div className="w-5 h-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                          ) : (
                            <svg
                              className="w-5 h-5 text-red-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add new card */}
                <div
                  onClick={() => setIsAddCardOpen(true)}
                  className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center min-h-70 hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <svg
                      className="w-6 h-6 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <p className="text-sm sm:text-base text-gray-900 font-medium">
                    Add new card
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Other payment options */}
          <div className="bg-white border-l border-r border-b rounded-b-lg border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
              Other payment options
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* PayPal */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-blue-600"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.04.22-.63 3.993-.028.15a.806.806 0 01-.795.68H7.72a.483.483 0 01-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502z" />
                      <path d="M8.708 5.578A1.21 1.21 0 019.892 5h5.5c1.828 0 3.14.39 3.892 1.16.844.864 1.128 2.158.844 3.844-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 00-.794.68l-.67 4.25a.483.483 0 01-.477.558H7.72a.483.483 0 01-.477-.558l1.466-9.476z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    E-wallet
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                  Paypal
                </h4>
                <p className="text-xs sm:text-sm text-gray-500 mb-4">
                  {customerEmail || "Not linked"}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
                    disabled
                  >
                    Coming Soon
                  </Button>
                </div>
              </div>

              {/* Apple Pay */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-8 h-8"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    E-wallet
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                  Apple pay
                </h4>
                <p className="text-xs sm:text-sm text-gray-500 mb-4">
                  {customer?.first_name
                    ? `iPhone (${customer.first_name}'s iPhone)`
                    : "Not linked"}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
                    disabled
                  >
                    Coming Soon
                  </Button>
                </div>
              </div>

              {/* Google Pay */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    E-wallet
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                  Google pay
                </h4>
                <p className="text-xs sm:text-sm text-gray-500 mb-4">
                  Connect your Google pay account
                </p>
                <Button
                  className="w-full text-white"
                  style={{
                    background:
                      "linear-gradient(90deg, #1e3a8a 0%, #7c3aed 100%)",
                  }}
                  disabled
                >
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Card Dialog */}
      <AddCardDialog
        open={isAddCardOpen}
        onOpenChange={setIsAddCardOpen}
        onSuccess={handleCardAdded}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Card"
        description="Are you sure you want to remove this card? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={!!deletingId}
        onConfirm={handleDelete}
      />
    </div>
  );
}
