"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ProfileSidebar from "@/components/layout/ProfileSidebar";
import { useAuthContext } from "@/lib/AuthContext";
import { AddAddressDialog } from "@/components/AddAddressDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useAddressStore, type CustomerAddress } from "@/lib/stores";
import { useAddressesQuery, useDeleteAddressMutation } from "@/lib/queries";

export default function MyAddressPage() {
  const router = useRouter();
  const { customer, loading, refreshCustomer } = useAuthContext();
  const { showToast } = useToast();
  
  // Local UI state for setting default loading
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // React Query for addresses
  const { data: addressesData = [], isLoading: loadingAddresses, refetch } = useAddressesQuery();
  const deleteAddressMutation = useDeleteAddressMutation();
  
  // Zustand address store (for UI state only)
  const {
    isAddDialogOpen,
    editingAddress,
    deleteConfirmOpen,
    addressToDelete,
    openAddDialog,
    closeAddDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteConfirm,
    closeDeleteConfirm,
  } = useAddressStore();

  // Use addresses from React Query
  const addresses = addressesData as CustomerAddress[];

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !customer) {
      router.push("/login");
    }
  }, [loading, customer, router]);

  // Get customer name for display
  const customerName = customer 
    ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "User"
    : "Guest";

  // Format address for display
  const formatAddress = (addr: CustomerAddress) => {
    const parts = [
      addr.address_1,
      addr.address_2,
      addr.city,
      addr.province,
      addr.postal_code,
      addr.country_code?.toUpperCase()
    ].filter(Boolean);
    return parts.join(", ");
  };

  // Format phone number
  const formatPhone = (phone?: string) => {
    if (!phone) return "-";
    return phone.startsWith("+") ? phone : `+${phone}`;
  };

  // Get display name for address
  const getAddressName = (addr: CustomerAddress) => {
    if (addr.address_name) return addr.address_name;
    if (addr.first_name || addr.last_name) {
      return [addr.first_name, addr.last_name].filter(Boolean).join(" ");
    }
    return customerName;
  };

  // Handle delete address
  const handleDelete = async () => {
    if (!addressToDelete) return;
    
    setDeletingId(addressToDelete);
    try {
      await deleteAddressMutation.mutateAsync(addressToDelete);
      closeDeleteConfirm();
    } catch (error) {
      console.error("Failed to delete address:", error);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle set as default
  const handleSetDefault = async (addressId: string | undefined) => {
    if (!addressId) return;
    setSettingDefaultId(addressId);
    try {
      // TODO: Add setDefaultAddressMutation when available
      showToast("Setting default address...", "info");
      await refreshCustomer();
    } catch (error) {
      console.error("Failed to set default address:", error);
      showToast("Failed to set default address. Please try again.", "error");
    } finally {
      setSettingDefaultId(null);
    }
  };

  // Handle add/edit address success
  const handleAddressSuccess = async () => {
    closeAddDialog();
    closeEditDialog();
    // Refetch addresses via React Query
    refetch();
  };

  // Loading state
  if (loading) {
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
        <ProfileSidebar activeMenu="My address" />

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="border rounded-t-lg border-gray-200 p-4 sm:p-6 mb-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              My address
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Manage your saved shipping address and add your new address for future orders
            </p>
          </div>

          {/* Your address section */}
          <div className="bg-white border-l border-r border-b rounded-b-lg border-gray-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
              Your address ({addresses.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dynamic Address Cards */}
              {addresses.map((addr) => (
                <div key={addr.id} className="border border-gray-200 rounded-lg p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900">
                      {getAddressName(addr)}
                    </h4>
                    {addr.is_default_shipping && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex gap-3 text-gray-600">
                      <svg
                        className="w-5 h-5 mt-0.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <p className="text-xs sm:text-sm">
                        {formatAddress(addr) || "No address details"}
                      </p>
                    </div>

                    <div className="flex gap-3 text-gray-600">
                      <svg
                        className="w-5 h-5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <p className="text-xs sm:text-sm">{formatPhone(addr.phone)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {!addr.is_default_shipping && (
                      <Button 
                        variant="outline" 
                        className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
                        onClick={() => handleSetDefault(addr.id)}
                        disabled={settingDefaultId === addr.id}
                      >
                        {settingDefaultId === addr.id ? "Setting..." : "Set as default"}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="flex-1 text-gray-700 border-gray-300 hover:bg-gray-50"
                      onClick={() => openEditDialog(addr)}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                      Edit
                    </Button>
                    <button 
                      className="p-2.5 hover:bg-red-50 rounded-lg transition-colors border border-gray-300 disabled:opacity-50"
                      onClick={() => addr.id && openDeleteConfirm(addr.id)}
                      disabled={deletingId === addr.id}
                    >
                      {deletingId === addr.id ? (
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
              ))}

              {/* Empty State if no addresses */}
              {addresses.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <p className="mb-2">No saved addresses yet</p>
                  <p className="text-sm">Add your first address to get started</p>
                </div>
              )}

              {/* Add new address */}
              <div 
                className="border border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center min-h-55 hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={openAddDialog}
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
                <p className="text-sm sm:text-base text-gray-900 font-medium">Add new address</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Address Dialog */}
      <AddAddressDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => !open && closeAddDialog()}
        onSuccess={handleAddressSuccess}
      />

      {/* Edit Address Dialog */}
      {editingAddress && (
        <AddAddressDialog
          open={!!editingAddress}
          onOpenChange={(open) => !open && closeEditDialog()}
          onSuccess={handleAddressSuccess}
          editAddress={editingAddress}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => !open && closeDeleteConfirm()}
        title="Delete Address"
        description="Are you sure you want to delete this address? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        loading={!!deletingId}
        onConfirm={handleDelete}
      />
    </div>
  );
}
