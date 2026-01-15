import { create } from "zustand";

// Address type (matching Medusa customer address)
export interface CustomerAddress {
  id: string;
  address_name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country_code?: string;
  phone?: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
  metadata?: Record<string, unknown>;
}

// Address store state
interface AddressState {
  addresses: CustomerAddress[];
  loading: boolean;
  error: string | null;
  
  // UI state
  isAddDialogOpen: boolean;
  editingAddress: CustomerAddress | null;
  deletingId: string | null;
  settingDefaultId: string | null;
  deleteConfirmOpen: boolean;
  addressToDelete: string | null;
}

// Address store actions
interface AddressActions {
  // Data actions
  setAddresses: (addresses: CustomerAddress[]) => void;
  addAddress: (address: CustomerAddress) => void;
  updateAddress: (id: string, address: Partial<CustomerAddress>) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  
  // Loading/error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // UI actions
  openAddDialog: () => void;
  closeAddDialog: () => void;
  openEditDialog: (address: CustomerAddress) => void;
  closeEditDialog: () => void;
  openDeleteConfirm: (id: string) => void;
  closeDeleteConfirm: () => void;
  setDeletingId: (id: string | null) => void;
  setSettingDefaultId: (id: string | null) => void;
  
  // Reset
  reset: () => void;
}

// Initial state
const initialState: AddressState = {
  addresses: [],
  loading: true,
  error: null,
  isAddDialogOpen: false,
  editingAddress: null,
  deletingId: null,
  settingDefaultId: null,
  deleteConfirmOpen: false,
  addressToDelete: null,
};

// Create address store
export const useAddressStore = create<AddressState & AddressActions>((set) => ({
  ...initialState,
  
  // Data actions
  setAddresses: (addresses) => set({ addresses, loading: false }),
  
  addAddress: (address) =>
    set((state) => ({
      addresses: [...state.addresses, address],
    })),
  
  updateAddress: (id, updates) =>
    set((state) => ({
      addresses: state.addresses.map((addr) =>
        addr.id === id ? { ...addr, ...updates } : addr
      ),
    })),
  
  removeAddress: (id) =>
    set((state) => ({
      addresses: state.addresses.filter((addr) => addr.id !== id),
      deleteConfirmOpen: false,
      addressToDelete: null,
    })),
  
  setDefaultAddress: (id) =>
    set((state) => ({
      addresses: state.addresses.map((addr) => ({
        ...addr,
        is_default_shipping: addr.id === id,
      })),
    })),
  
  // Loading/error
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  // UI actions
  openAddDialog: () => set({ isAddDialogOpen: true }),
  closeAddDialog: () => set({ isAddDialogOpen: false }),
  
  openEditDialog: (address) => set({ editingAddress: address }),
  closeEditDialog: () => set({ editingAddress: null }),
  
  openDeleteConfirm: (id) => set({ deleteConfirmOpen: true, addressToDelete: id }),
  closeDeleteConfirm: () => set({ deleteConfirmOpen: false, addressToDelete: null }),
  
  setDeletingId: (id) => set({ deletingId: id }),
  setSettingDefaultId: (id) => set({ settingDefaultId: id }),
  
  // Reset
  reset: () => set(initialState),
}));
