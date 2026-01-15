"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProfileSidebar from "@/components/layout/ProfileSidebar";
import { useAuthContext } from "@/lib/AuthContext";
import { useOrdersQuery } from "@/lib/queries";
import * as api from "@/lib/api";
import { useProfileForm } from "@/lib/forms";
import { Controller } from "react-hook-form";

export default function ProfilePage() {
  const router = useRouter();
  const { customer, loading, role, roleInfo, refreshCustomer } = useAuthContext();
  const { data: ordersData } = useOrdersQuery();
  const orders = ordersData || [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // React Hook Form for profile
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useProfileForm();
  
  const profileImage = watch("profileImage");
  const fullName = watch("fullName");
  const email = watch("email");
  
  // Local UI state
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Update form when customer data loads
  useEffect(() => {
    if (customer) {
      console.log('[PROFILE] Customer loaded:', customer);
      console.log('[PROFILE] Metadata:', customer.metadata);
      console.log('[PROFILE] Profile image:', customer.metadata?.profile_image);
      
      const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
      const phone = customer.phone?.replace(/^\+60\s*/, "") || "";
      const dateOfBirth = customer.metadata?.date_of_birth as string | undefined;
      
      let dobDay = "";
      let dobMonth = "";
      let dobYear = "";
      
      if (dateOfBirth) {
        const parts = dateOfBirth.split("-");
        if (parts.length === 3) {
          dobYear = parts[0];
          dobMonth = new Date(dateOfBirth).toLocaleString('default', { month: 'long' }).toLowerCase();
          dobDay = parts[2];
        }
      }
      
      reset({
        fullName,
        phone,
        email: customer.email,
        gender: (customer.metadata?.gender as "male" | "female" | "other") || "other",
        dobDay,
        dobMonth,
        dobYear,
        profileImage: (customer.metadata?.profile_image as string) || "",
      });
    }
  }, [customer, reset]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !customer) {
      router.push("/login");
    }
  }, [loading, customer, router]);

  // Get member since date
  const getMemberSince = () => {
    if (!customer?.created_at) return "";
    const date = new Date(customer.created_at);
    return `Since ${date.toLocaleString('default', { month: 'short' })}, ${date.getFullYear()}`;
  };

  // Calculate order statistics
  const orderStats = {
    totalProducts: orders?.reduce((sum: number, order: any) => {
      return sum + (order.items?.reduce((itemSum: number, item: any) => itemSum + (item.quantity || 0), 0) || 0);
    }, 0) || 0,
    totalPayment: orders?.reduce((sum: number, order: any) => {
      // Only count captured/paid orders
      if (order.payment_status === 'captured' || order.payment_status === 'paid') {
        return sum + (order.total || 0);
      }
      return sum;
    }, 0) || 0,
  };

  // Month name to number helper
  const monthNameToNumber = (monthName: string): number => {
    const months: Record<string, number> = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    return months[monthName.toLowerCase()] || 1;
  };

  // Handle save with react-hook-form
  const onSubmit = async (data: any) => {
    if (!customer) return;

    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Split full name into first and last name
      const nameParts = data.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Build date of birth if provided
      let dateOfBirth: string | null = null;
      if (data.dobDay && data.dobMonth && data.dobYear) {
        const monthNum = monthNameToNumber(data.dobMonth);
        dateOfBirth = `${data.dobYear}-${String(monthNum).padStart(2, '0')}-${String(data.dobDay).padStart(2, '0')}`;
      }

      await api.updateCustomer({
        first_name: firstName,
        last_name: lastName,
        phone: data.phone ? `+60${data.phone.replace(/^\+60\s*/, '')}` : undefined,
        metadata: {
          ...(customer.metadata || {}),
          gender: data.gender,
          date_of_birth: dateOfBirth,
          profile_image: data.profileImage,
        },
      });

      // Refresh customer data
      await refreshCustomer();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setSaveError("Failed to update profile. Please try again.");
    }
  };

  // Handle reset
  const handleReset = () => {
    if (customer) {
      const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
      const phone = customer.phone?.replace(/^\+60\s*/, "") || "";
      const dateOfBirth = customer.metadata?.date_of_birth as string | undefined;
      
      let dobDay = "";
      let dobMonth = "";
      let dobYear = "";
      
      if (dateOfBirth) {
        const parts = dateOfBirth.split("-");
        if (parts.length === 3) {
          dobYear = parts[0];
          dobMonth = new Date(dateOfBirth).toLocaleString('default', { month: 'long' }).toLowerCase();
          dobDay = parts[2];
        }
      }
      
      reset({
        fullName,
        phone,
        email: customer.email,
        gender: (customer.metadata?.gender as "male" | "female" | "other") || "other",
        dobDay,
        dobMonth,
        dobYear,
        profileImage: (customer.metadata?.profile_image as string) || "",
      });
    }
    setSaveError(null);
    setSaveSuccess(false);
  };

  // Handle profile image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setSaveError("Invalid image type. Please use JPEG, PNG, GIF, or WebP.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Image too large. Maximum size is 5MB.");
      return;
    }

    setUploadingImage(true);
    setSaveError(null);

    try {
      // Upload file directly using FormData
      const imageUrl = await api.uploadProfileImage(file);
      console.log('[PROFILE] Image uploaded:', imageUrl);
      
      // Update form value
      setValue("profileImage", imageUrl, { shouldDirty: true });
      
      // Refresh customer data to get updated metadata
      await refreshCustomer();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to upload image:", error);
      setSaveError("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
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
        <ProfileSidebar activeMenu="My account" />

        {/* Main Content */}
        <div className="flex-1">
          {/* Header - spanning both columns */}
          <div className="border-t border-l border-r rounded-t-lg border-b border-gray-200 p-4 sm:p-6 mb-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
              My account
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Edit or complete your account information, including your data
              security.
            </p>
          </div>

          {/* Content Row */}
          <div className="flex flex-col lg:flex-row gap-0">
            {/* Form Section */}
            <div className="flex-1 bg-white border-l border-r border-b lg:border-b border-gray-200 rounded-b-lg lg:rounded-bl-lg lg:rounded-br-none p-4 sm:p-6 lg:p-8">
              <div className="space-y-4 sm:space-y-5">
                {/* Full name */}
                <div>
                  <Label
                    htmlFor="fullname"
                    className="text-sm font-medium text-gray-700 mb-1.5 block"
                  >
                    Full name
                  </Label>
                  <Input
                    id="fullname"
                    {...register("fullName")}
                    className="h-12"
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Phone number */}
                <div>
                  <Label
                    htmlFor="phone"
                    className="text-sm font-medium text-gray-700 mb-1.5 block"
                  >
                    Phone number
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 px-3 border border-gray-200 rounded-lg bg-white h-12">
                      <span className="text-lg">🇲🇾</span>
                      <span className="text-sm text-gray-700 font-medium">
                        +60
                      </span>
                    </div>
                    <Input
                      id="phone"
                      {...register("phone")}
                      className="flex-1 h-12"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <Label
                    htmlFor="gender"
                    className="text-sm font-medium text-gray-700 mb-1.5 block"
                  >
                    Gender
                  </Label>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Email */}
                <div>
                  <Label
                    htmlFor="email"
                    className="text-sm font-medium text-gray-700 mb-1.5 block"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="h-12"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                {/* Date of birth */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    Date of birth
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      {...register("dobDay")}
                      placeholder="Day"
                      type="number"
                      min="1"
                      max="31"
                      className="h-12"
                    />
                    <Controller
                      name="dobMonth"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full h-12!">
                            <SelectValue placeholder="Month" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="January">January</SelectItem>
                            <SelectItem value="February">February</SelectItem>
                            <SelectItem value="March">March</SelectItem>
                            <SelectItem value="April">April</SelectItem>
                            <SelectItem value="May">May</SelectItem>
                            <SelectItem value="June">June</SelectItem>
                            <SelectItem value="July">July</SelectItem>
                            <SelectItem value="August">August</SelectItem>
                            <SelectItem value="September">September</SelectItem>
                            <SelectItem value="October">October</SelectItem>
                            <SelectItem value="November">November</SelectItem>
                            <SelectItem value="December">December</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <Input
                      {...register("dobYear")}
                      placeholder="Year"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      className="h-12"
                    />
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {saveError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
                  Profile updated successfully!
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6 sm:mt-8">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSubmitting}
                  className="px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base text-gray-700 border-gray-300 w-full sm:w-auto"
                >
                  Reset all
                </Button>
                <Button 
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting || !isDirty}
                  className="px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white w-full sm:w-auto"
                >
                  {isSubmitting ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-full lg:w-96 shrink-0 border-l lg:border-l-0 border-r border-b border-t lg:border-t-0 border-gray-200 rounded-b-lg lg:rounded-bl-none lg:rounded-br-lg overflow-hidden mt-0">
              {/* Profile Card */}
              <div 
                className="bg-white p-4 sm:p-6 lg:p-8"
                style={{
                  background: "linear-gradient(to bottom, #EBF0FEB2, #EBF0FE00)",
                }}
              >
                <div className="pb-6 sm:pb-8">
                  <div className="flex justify-end mb-4 sm:mb-6">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      disabled={uploadingImage}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingImage ? (
                        <>
                          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
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
                          Change image
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex justify-center lg:justify-start">
                    {/* Debug: show profileImage value */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="absolute top-0 left-0 text-xs bg-black text-white p-1 max-w-50 truncate z-50">
                        IMG: {profileImage || 'empty'}
                      </div>
                    )}
                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40">
                      <div className="w-full h-full rounded-full overflow-hidden border-4 border-dashed border-gray-300">
                        {uploadingImage ? (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : profileImage ? (
                          <img
                            src={profileImage}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('[PROFILE] Image failed to load:', profileImage);
                              // Fallback to initials on error
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                            onLoad={() => console.log('[PROFILE] Image loaded successfully')}
                          />
                        ) : (
                          <div className="w-full h-full bg-linear-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-4xl font-bold">
                            {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center lg:items-start mb-6 sm:mb-8">
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 text-center lg:text-left">
                    {fullName || "User"}
                  </h3>

                  <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 mb-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {email || "No email"}
                  </div>

                  {roleInfo && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        role === 'vip' ? 'bg-purple-100 text-purple-800' :
                        role === 'bulk' ? 'bg-blue-100 text-blue-800' :
                        role === 'supplier' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {roleInfo.name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {getMemberSince()}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 mb-4 sm:mb-6">
                  <div className="flex flex-col sm:flex-row">
                    <div className="p-4 sm:p-6 flex-1">
                      <p className="text-xs text-gray-500 mb-1 sm:mb-2">
                        Product purchase
                      </p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">
                        {orderStats.totalProducts} Products
                      </p>
                    </div>
                    <div className="border-t sm:border-t-0 sm:border-r border-gray-200" />
                    <div className="p-4 sm:p-6 flex-1">
                      <p className="text-xs text-gray-500 mb-1 sm:mb-2">
                        Total Payment
                      </p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">
                        RM{(orderStats.totalPayment / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Forgot Password Card */}
                <div className="bg-white -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 border-t border-gray-200">
                  <div className="flex justify-center mb-4 sm:mb-6">
                    <div className="w-32 h-32 sm:w-36 sm:h-36 lg:w-40 lg:h-40">
                      <svg
                        viewBox="0 0 200 200"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <ellipse
                          cx="70"
                          cy="140"
                          rx="35"
                          ry="20"
                          fill="#4F46E5"
                          opacity="0.2"
                        />
                        <circle cx="70" cy="85" r="35" fill="#4F46E5" />
                        <ellipse cx="75" cy="95" rx="8" ry="12" fill="white" />
                        <ellipse cx="85" cy="95" rx="8" ry="12" fill="white" />
                        <path
                          d="M 95 60 L 140 75 L 135 95 L 90 80 Z"
                          fill="#FCD34D"
                        />
                        <circle cx="135" cy="70" r="12" fill="#FCD34D" />
                        <rect
                          x="130"
                          y="68"
                          width="10"
                          height="4"
                          fill="#1E293B"
                        />
                      </svg>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 text-center lg:text-left">
                    Forgot password?
                  </h3>

                  <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 text-center lg:text-left">
                    Don&apos;t worry, you can create a new password for your
                    account.
                  </p>

                  <Button
                    variant="outline"
                    className="w-full h-11 sm:h-12 text-sm sm:text-base bg-gray-100 border-0 text-gray-900 hover:bg-gray-200 font-medium"
                  >
                    Reset password
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
