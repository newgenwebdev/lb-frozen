"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/contexts/ToastContext"
import { BrandFormSchema, type BrandFormData } from "@/lib/validators/brand"
import { getBrand, updateBrand } from "@/lib/api/brands"
import { uploadFile } from "@/lib/api/uploads"

export default function EditBrandPage(): React.JSX.Element {
  const router = useRouter()
  const params = useParams()
  const brandId = params.id as string
  const queryClient = useQueryClient()
  const { showToast, confirm } = useToast()

  // Dropdown states
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)

  // Logo upload states
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch brand data
  const { data: brand, isLoading: isLoadingBrand } = useQuery({
    queryKey: ["brands", brandId],
    queryFn: () => getBrand(brandId),
    enabled: !!brandId,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<BrandFormData>({
    resolver: zodResolver(BrandFormSchema) as Resolver<BrandFormData>,
    defaultValues: {
      name: "",
      handle: "",
      description: "",
      logo_url: "",
      is_active: true,
      rank: 0,
    },
  })

  const isActive = watch("is_active")

  // Populate form when brand data loads
  useEffect(() => {
    if (brand) {
      reset({
        name: brand.name,
        handle: brand.handle,
        description: brand.description || "",
        logo_url: brand.logo_url || "",
        is_active: brand.is_active ?? true,
        rank: brand.rank ?? 0,
      })
      // Set existing logo URL for preview
      if (brand.logo_url) {
        setExistingLogoUrl(brand.logo_url)
      }
    }
  }, [brand, reset])

  // Handle logo file selection
  const handleLogoChange = (file: File | null): void => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file", "error")
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5MB", "error")
      return
    }

    setLogoFile(file)
    const preview = URL.createObjectURL(file)
    setLogoPreview(preview)
    setExistingLogoUrl(null) // Clear existing logo when new file is selected
  }

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleLogoChange(file)
    }
  }

  const handleRemoveLogo = (): void => {
    setLogoFile(null)
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview)
      setLogoPreview(null)
    }
    setExistingLogoUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Get the current logo to display (new upload preview or existing)
  const currentLogoUrl = logoPreview || existingLogoUrl

  // Update brand mutation
  const updateBrandMutation = useMutation({
    mutationFn: async (data: BrandFormData) => {
      let logoUrl: string | undefined = existingLogoUrl || undefined

      // Upload new logo if file is selected
      if (logoFile) {
        setIsUploading(true)
        try {
          logoUrl = await uploadFile(logoFile)
        } catch (error) {
          console.error("Failed to upload logo:", error)
          throw new Error("Failed to upload logo")
        } finally {
          setIsUploading(false)
        }
      } else if (!currentLogoUrl) {
        // Logo was removed
        logoUrl = undefined
      }

      return updateBrand(brandId, {
        name: data.name,
        handle: data.handle,
        description: data.description || undefined,
        logo_url: logoUrl,
        is_active: data.is_active ?? true,
        rank: data.rank ?? 0,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] })
      showToast("Brand updated successfully!", "success")
      router.push("/admin/brands")
    },
    onError: (error) => {
      console.error("Failed to update brand:", error)
      showToast("Failed to update brand. Please try again.", "error")
    },
  })

  const onSubmit = (data: BrandFormData): void => {
    updateBrandMutation.mutate(data)
  }

  const handleCancel = async (): Promise<void> => {
    if (isDirty) {
      const confirmed = await confirm({
        title: "Discard Changes",
        message: "Are you sure you want to discard your changes? This action cannot be undone.",
        confirmText: "Discard",
        cancelText: "Cancel",
      })

      if (!confirmed) {
        return
      }
    }
    router.push("/admin/brands")
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest("[data-dropdown]")) {
        setIsStatusDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (isLoadingBrand) {
    return (
      <div className="px-4 md:px-8">
        <div className="animate-pulse">
          <div className="mb-6 h-8 w-48 rounded bg-gray-200"></div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <div className="mb-6 h-6 w-24 rounded bg-gray-200"></div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="mb-2 h-4 w-24 rounded bg-gray-200"></div>
                  <div className="h-12 w-full rounded bg-gray-100"></div>
                </div>
              ))}
              <div className="lg:col-span-2">
                <div className="mb-2 h-4 w-24 rounded bg-gray-200"></div>
                <div className="h-32 w-full rounded bg-gray-100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#030712]">
          Edit Brand
        </h1>
        <div className="flex items-center gap-3">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={handleCancel}
            className="cursor-pointer rounded-lg border border-[#E5E7EB] bg-white px-4 py-2.5 text-center font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712] transition-colors hover:bg-[#F9FAFB]"
          >
            Cancel
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={updateBrandMutation.isPending || isUploading || (!isDirty && !logoFile && existingLogoUrl === brand?.logo_url)}
            className="cursor-pointer rounded-lg bg-[#2F2F2F] px-4 py-2.5 text-center font-geist text-[14px] font-medium tracking-[-0.14px] text-white transition-colors hover:bg-[#3D3D3D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : updateBrandMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <h2 className="mb-6 font-geist text-[16px] font-medium leading-[150%] tracking-[-0.16px] text-[#020817]">
          Brand
        </h2>

        <form id="edit-brand-form" onSubmit={handleSubmit(onSubmit)}>
          {/* Main row: Logo on left, fields on right */}
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Logo Upload - Left side */}
            <div className="shrink-0">
              <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                Logo
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleLogoChange(e.target.files?.[0] || null)}
                className="hidden"
              />
              {currentLogoUrl ? (
                <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-[#E3E3E3]">
                  <Image
                    src={currentLogoUrl}
                    alt="Logo preview"
                    fill
                    className="object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute right-1 top-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                    isDragging
                      ? "border-[#2F2F2F] bg-[#F9FAFB]"
                      : "border-[#E3E3E3] hover:border-[#999] hover:bg-[#F9FAFB]"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span className="mt-2 text-center font-geist text-[12px] text-[#6A7282]">
                    Click or drag
                  </span>
                </div>
              )}
            </div>

            {/* Right side: Brand Name, Handle, Status */}
            <div className="flex flex-1 flex-col gap-4">
              {/* Brand Name */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Brand Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2.5L12.5 7.5L17.5 8.125L13.75 11.875L14.75 17.5L10 14.625L5.25 17.5L6.25 11.875L2.5 8.125L7.5 7.5L10 2.5Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter brand name"
                    {...register("name")}
                    className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Handle and Status in a row on larger screens */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Handle */}
                <div>
                  <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                    Handle
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7.5 17.5L12.5 2.5M5 6.25H2.5C2.16848 6.25 1.85054 6.3817 1.61612 6.61612C1.3817 6.85054 1.25 7.16848 1.25 7.5V12.5C1.25 12.8315 1.3817 13.1495 1.61612 13.3839C1.85054 13.6183 2.16848 13.75 2.5 13.75H5M15 6.25H17.5C17.8315 6.25 18.1495 6.3817 18.3839 6.61612C18.6183 6.85054 18.75 7.16848 18.75 7.5V12.5C18.75 12.8315 18.6183 13.1495 18.3839 13.3839C18.1495 13.6183 17.8315 13.75 17.5 13.75H15" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter brand handle"
                      {...register("handle")}
                      className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                    />
                  </div>
                  {errors.handle && (
                    <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                      {errors.handle.message}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div data-dropdown>
                  <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                    Status
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M13.3264 6.67372C15.1635 8.51081 15.1635 11.4893 13.3264 13.3264C11.4893 15.1635 8.51081 15.1635 6.67372 13.3264C4.83663 11.4893 4.83663 8.51081 6.67372 6.67372C8.51081 4.83663 11.4893 4.83663 13.3264 6.67372" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7.17708 16.9754C5.67291 16.3704 4.35291 15.2796 3.47874 13.7662C2.62291 12.2846 2.33624 10.6346 2.53874 9.05957" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5.37305 4.06708C6.64888 3.06708 8.25388 2.46875 10.0014 2.46875C11.7122 2.46875 13.2847 3.04542 14.5472 4.00792" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12.8262 16.9754C14.3303 16.3704 15.6503 15.2796 16.5245 13.7662C17.3803 12.2846 17.667 10.6346 17.4645 9.05957" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-4 text-left font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors hover:border-[#999] focus:border-black"
                    >
                      <span>{isActive ? "Active" : "Non Active"}</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        className={`transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`}
                      >
                        <path
                          d="M5 7.5L10 12.5L15 7.5"
                          stroke="#6A7282"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {/* Status Dropdown */}
                    {isStatusDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setValue("is_active", true, { shouldDirty: true })
                            setIsStatusDropdownOpen(false)
                          }}
                          className={`flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left font-geist text-[14px] transition-colors hover:bg-[#F9FAFB] ${
                            isActive ? "bg-[#F9FAFB] text-[#030712]" : "text-[#030712]"
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                          Active
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setValue("is_active", false, { shouldDirty: true })
                            setIsStatusDropdownOpen(false)
                          }}
                          className={`flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left font-geist text-[14px] transition-colors hover:bg-[#F9FAFB] ${
                            !isActive ? "bg-[#F9FAFB] text-[#030712]" : "text-[#030712]"
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                          Non Active
                        </button>
                      </div>
                    )}
                  </div>
                  {errors.is_active && (
                    <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                      {errors.is_active.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description - Full Width below */}
          <div className="mt-6">
            <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
              Description
            </label>
            <textarea
              placeholder="Enter brand description"
              {...register("description")}
              rows={6}
              className="w-full resize-none rounded-lg border border-[#E3E3E3] bg-white p-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
            />
            {errors.description && (
              <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                {errors.description.message}
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
