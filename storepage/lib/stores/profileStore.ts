import { create } from "zustand";

// Profile form state
interface ProfileFormState {
  fullName: string;
  phone: string;
  email: string;
  gender: "male" | "female" | "other";
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  profileImage: string;
}

// Profile store state
interface ProfileState extends ProfileFormState {
  // Form dirty state
  isDirty: boolean;
  
  // Original values (for comparison)
  originalValues: ProfileFormState | null;
}

// Profile store actions
interface ProfileActions {
  // Setters
  setFullName: (name: string) => void;
  setPhone: (phone: string) => void;
  setEmail: (email: string) => void;
  setGender: (gender: "male" | "female" | "other") => void;
  setDobDay: (day: string) => void;
  setDobMonth: (month: string) => void;
  setDobYear: (year: string) => void;
  setProfileImage: (url: string) => void;
  
  // Bulk update
  setProfileForm: (data: Partial<ProfileFormState>) => void;
  
  // Initialize from customer data
  initializeFromCustomer: (customer: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    metadata?: {
      gender?: string;
      dob?: string;
      date_of_birth?: string;
      profile_image?: string;
    };
  }) => void;
  
  // Reset to original
  resetForm: () => void;
  
  // Mark as saved
  markAsSaved: () => void;
}

// Initial state
const initialFormState: ProfileFormState = {
  fullName: "",
  phone: "",
  email: "",
  gender: "other",
  dobDay: "",
  dobMonth: "",
  dobYear: "",
  profileImage: "",
};

const initialState: ProfileState = {
  ...initialFormState,
  isDirty: false,
  originalValues: null,
};

// Create profile store
export const useProfileStore = create<ProfileState & ProfileActions>((set, get) => ({
  ...initialState,
  
  // Individual setters
  setFullName: (name) => set({ fullName: name, isDirty: true }),
  setPhone: (phone) => set({ phone, isDirty: true }),
  setEmail: (email) => set({ email, isDirty: true }),
  setGender: (gender) => set({ gender, isDirty: true }),
  setDobDay: (day) => set({ dobDay: day, isDirty: true }),
  setDobMonth: (month) => set({ dobMonth: month, isDirty: true }),
  setDobYear: (year) => set({ dobYear: year, isDirty: true }),
  setProfileImage: (url) => set({ profileImage: url, isDirty: true }),
  
  // Bulk update
  setProfileForm: (data) => set((state) => ({ ...state, ...data, isDirty: true })),
  
  // Initialize from customer data
  initializeFromCustomer: (customer) => {
    const fullName = [customer.first_name, customer.last_name]
      .filter(Boolean)
      .join(" ");
    
    // Parse DOB - handle date_of_birth field
    let dobDay = "";
    let dobMonth = "";
    let dobYear = "";
    const dob = customer.metadata?.date_of_birth || customer.metadata?.dob;
    if (dob) {
      const date = new Date(dob);
      dobDay = date.getDate().toString();
      dobMonth = date.toLocaleString('default', { month: 'long' });
      dobYear = date.getFullYear().toString();
    }
    
    const formState: ProfileFormState = {
      fullName,
      phone: customer.phone?.replace(/^\+60\s*/, "") || "",
      email: customer.email || "",
      gender: (customer.metadata?.gender as "male" | "female" | "other") || "other",
      dobDay,
      dobMonth,
      dobYear,
      profileImage: customer.metadata?.profile_image || "",
    };
    
    set({
      ...formState,
      isDirty: false,
      originalValues: formState,
    });
  },
  
  // Reset to original values
  resetForm: () => {
    const { originalValues } = get();
    if (originalValues) {
      set({
        ...originalValues,
        isDirty: false,
      });
    }
  },
  
  // Mark as saved
  markAsSaved: () => {
    const state = get();
    const currentValues: ProfileFormState = {
      fullName: state.fullName,
      phone: state.phone,
      email: state.email,
      gender: state.gender,
      dobDay: state.dobDay,
      dobMonth: state.dobMonth,
      dobYear: state.dobYear,
      profileImage: state.profileImage,
    };
    set({
      isDirty: false,
      originalValues: currentValues,
    });
  },
}));

// Export types
export type { ProfileFormState };
