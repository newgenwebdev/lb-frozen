"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";

// Types
type CustomerRole = "retail" | "bulk" | "vip" | "supplier";

interface CustomerWithRole {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  role: CustomerRole;
  metadata?: {
    role?: CustomerRole;
  };
}

interface CustomersResponse {
  customers: CustomerWithRole[];
}

interface CreateCustomerPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  password: string;
  role: CustomerRole;
}

const CUSTOMER_ROLES = {
  RETAIL: "retail" as const,
  BULK: "bulk" as const,
  VIP: "vip" as const,
  SUPPLIER: "supplier" as const,
};

// API functions
async function getAllCustomersWithRoles(): Promise<CustomersResponse> {
  const response = await api.get<CustomersResponse>("/admin/customers/roles");
  return response.data;
}

async function createCustomerWithRole(
  payload: CreateCustomerPayload
): Promise<CustomerWithRole> {
  const response = await api.post<{ customer: CustomerWithRole }>(
    "/admin/customers/create",
    payload
  );
  return response.data.customer;
}

async function updateCustomerRole(
  customerId: string,
  role: CustomerRole
): Promise<CustomerWithRole> {
  const response = await api.put<{ customer: CustomerWithRole }>(
    `/admin/customers/${customerId}/role`,
    { role }
  );
  return response.data.customer;
}

async function deleteCustomer(customerId: string): Promise<void> {
  await api.delete(`/admin/customers/${customerId}`);
}

// Role badge component
function RoleBadge({ role }: { role: CustomerRole }): React.JSX.Element {
  const colors: Record<CustomerRole, string> = {
    retail: "bg-gray-100 text-gray-700 border-gray-200",
    bulk: "bg-blue-100 text-blue-700 border-blue-200",
    vip: "bg-yellow-100 text-yellow-700 border-yellow-200",
    supplier: "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${colors[role]}`}
    >
      {role}
    </span>
  );
}

// Modal/Dialog component
function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-10">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function CustomersPage(): React.JSX.Element {
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<CustomerRole | "all">("all");

  // Add customer modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<CreateCustomerPayload>({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    role: CUSTOMER_ROLES.RETAIL,
  });

  // Edit role modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithRole | null>(null);
  const [editRole, setEditRole] = useState<CustomerRole>(CUSTOMER_ROLES.RETAIL);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] =
    useState<CustomerWithRole | null>(null);

  // Queries
  const {
    data: customersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["customers-with-roles"],
    queryFn: getAllCustomersWithRoles,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCustomerWithRole,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers-with-roles"] });
      setIsAddModalOpen(false);
      setNewCustomer({
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        role: CUSTOMER_ROLES.RETAIL,
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: CustomerRole }) =>
      updateCustomerRole(id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers-with-roles"] });
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers-with-roles"] });
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    },
  });

  // Handlers
  const handleAddCustomer = (): void => {
    if (newCustomer.email && newCustomer.password) {
      createMutation.mutate(newCustomer);
    }
  };

  const handleUpdateRole = (): void => {
    if (selectedCustomer) {
      updateRoleMutation.mutate({ id: selectedCustomer.id, role: editRole });
    }
  };

  const handleDeleteCustomer = (): void => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete.id);
    }
  };

  const openEditModal = (customer: CustomerWithRole): void => {
    setSelectedCustomer(customer);
    setEditRole(customer.role);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (customer: CustomerWithRole): void => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  // Filter customers
  const filteredCustomers =
    customersData?.customers?.filter((customer) => {
      const matchesSearch =
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole =
        roleFilter === "all" || customer.role === roleFilter;
      return matchesSearch && matchesRole;
    }) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading customers: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage customer accounts and their pricing roles
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Add Customer
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(e.target.value)
            }
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setRoleFilter(e.target.value as CustomerRole | "all")
          }
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300"
        >
          <option value="all">All Roles</option>
          <option value="retail">Retail</option>
          <option value="bulk">Bulk</option>
          <option value="vip">VIP</option>
          <option value="supplier">Supplier</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Customer
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Email
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Role
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">
                Created
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  No customers found
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">
                      {customer.first_name || customer.last_name
                        ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim()
                        : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{customer.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={customer.role} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditModal(customer)}
                      >
                        Edit Role
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(customer)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={newCustomer.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewCustomer({ ...newCustomer, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300"
              placeholder="customer@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={newCustomer.first_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewCustomer({ ...newCustomer, first_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={newCustomer.last_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewCustomer({ ...newCustomer, last_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              value={newCustomer.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewCustomer({ ...newCustomer, password: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={newCustomer.role}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setNewCustomer({
                  ...newCustomer,
                  role: e.target.value as CustomerRole,
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300"
            >
              <option value="retail">Retail</option>
              <option value="bulk">Bulk</option>
              <option value="vip">VIP</option>
              <option value="supplier">Supplier</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomer}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Customer"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Customer Role"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Update role for{" "}
            <span className="font-medium">{selectedCustomer?.email}</span>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={editRole}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setEditRole(e.target.value as CustomerRole)
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300"
            >
              <option value="retail">Retail</option>
              <option value="bulk">Bulk</option>
              <option value="vip">VIP</option>
              <option value="supplier">Supplier</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Customer"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete customer{" "}
            <span className="font-medium">{customerToDelete?.email}</span>? This
            action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteCustomer}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
