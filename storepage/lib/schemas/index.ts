/**
 * Form Schemas using Zod
 * Centralized validation schemas for all forms
 */

import { z } from "zod";

// ============================================
// AUTH FORMS
// ============================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ============================================
// PROFILE FORM
// ============================================

export const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email").optional(),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[0-9+\-\s()]+$/.test(val),
      "Please enter a valid phone number"
    ),
  gender: z.enum(["male", "female", "other"]).optional(),
  dobDay: z.string().optional(),
  dobMonth: z.string().optional(),
  dobYear: z.string().optional(),
  profileImage: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

// ============================================
// ADDRESS FORM
// ============================================

export const addressSchema = z.object({
  address_name: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  company: z.string().optional(),
  address_1: z.string().min(1, "Address is required"),
  address_2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "State is required"),
  postal_code: z
    .string()
    .min(1, "Postal code is required")
    .regex(/^[0-9]{5}$/, "Please enter a valid 5-digit postal code"),
  country_code: z.string().min(1, "Country is required"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
  is_default_shipping: z.boolean().optional(),
  is_default_billing: z.boolean().optional(),
});

export type AddressFormData = z.infer<typeof addressSchema>;

// ============================================
// CHECKOUT FORMS
// ============================================

export const guestAddressSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  address_1: z.string().min(1, "Address is required"),
  address_2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "State is required"),
  postal_code: z
    .string()
    .min(1, "Postal code is required")
    .regex(/^[0-9]{5}$/, "Please enter a valid 5-digit postal code"),
  country_code: z.string().default("my"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
});

export type GuestAddressFormData = z.infer<typeof guestAddressSchema>;

export const guestEmailSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

export type GuestEmailFormData = z.infer<typeof guestEmailSchema>;

// ============================================
// PAYMENT FORMS
// ============================================

export const promoCodeSchema = z.object({
  code: z.string().min(1, "Please enter a promo code"),
});

export type PromoCodeFormData = z.infer<typeof promoCodeSchema>;

// ============================================
// REVIEW FORM
// ============================================

export const reviewSchema = z.object({
  rating: z.number().min(1, "Please select a rating").max(5),
  title: z.string().optional(),
  content: z.string().min(10, "Review must be at least 10 characters"),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

// ============================================
// CONTACT FORM
// ============================================

export const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export type ContactFormData = z.infer<typeof contactSchema>;
