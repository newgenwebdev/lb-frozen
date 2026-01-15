/**
 * Reusable Form Hooks with React Hook Form + Zod
 * Pre-configured form hooks for common forms
 */

"use client";

import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  loginSchema,
  registerSchema,
  profileSchema,
  addressSchema,
  guestAddressSchema,
  reviewSchema,
  contactSchema,
  type LoginFormData,
  type RegisterFormData,
  type ProfileFormData,
  type AddressFormData,
  type GuestAddressFormData,
  type ReviewFormData,
  type ContactFormData,
} from "../schemas";

/**
 * Login form hook
 */
export function useLoginForm(): UseFormReturn<LoginFormData> {
  return useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
}

/**
 * Register form hook
 */
export function useRegisterForm(): UseFormReturn<RegisterFormData> {
  return useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });
}

/**
 * Profile form hook
 */
export function useProfileForm(
  defaultValues?: Partial<ProfileFormData>
): UseFormReturn<ProfileFormData> {
  return useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      gender: "other",
      dobDay: "",
      dobMonth: "",
      dobYear: "",
      profileImage: "",
      ...defaultValues,
    },
  });
}

/**
 * Address form hook
 */
export function useAddressForm(
  defaultValues?: Partial<AddressFormData>
): UseFormReturn<AddressFormData> {
  return useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address_name: "",
      first_name: "",
      last_name: "",
      company: "",
      address_1: "",
      address_2: "",
      city: "",
      province: "",
      postal_code: "",
      country_code: "my",
      phone: "",
      is_default_shipping: false,
      is_default_billing: false,
      ...defaultValues,
    },
  });
}

/**
 * Guest address form hook (for checkout)
 */
export function useGuestAddressForm(
  defaultValues?: Partial<GuestAddressFormData>
): UseFormReturn<GuestAddressFormData> {
  return useForm<GuestAddressFormData>({
    resolver: zodResolver(guestAddressSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      address_1: "",
      address_2: "",
      city: "",
      province: "",
      postal_code: "",
      country_code: "my",
      phone: "",
      ...defaultValues,
    },
  });
}

/**
 * Review form hook
 */
export function useReviewForm(
  defaultValues?: Partial<ReviewFormData>
): UseFormReturn<ReviewFormData> {
  return useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      title: "",
      content: "",
      ...defaultValues,
    },
  });
}

/**
 * Contact form hook
 */
export function useContactForm(): UseFormReturn<ContactFormData> {
  return useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });
}
