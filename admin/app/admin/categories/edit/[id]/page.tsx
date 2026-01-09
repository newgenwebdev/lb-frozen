"use client"

import React, { useState, useEffect, useRef } from "react"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/contexts/ToastContext"
import { CreateCategorySchema } from "@/lib/validators/category"
import { getCategory, updateCategory, deleteCategory } from "@/lib/api/categories"
import { useCategories } from "@/lib/api/queries"
import { uploadFile } from "@/lib/api/uploads"

/**
 * Form data type - using Zod's input type for form state
 */
type CategoryFormData = {
  name: string
  handle: string
  description?: string
  is_active?: boolean
  is_internal?: boolean
  parent_category_id?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default function EditCategoryPage(): React.JSX.Element {
  const router = useRouter()
  const params = useParams()
  const categoryId = params.id as string
  const queryClient = useQueryClient()
  const { showToast, confirm } = useToast()

  // Track if form has been initialized with data
  const [isInitialized, setIsInitialized] = useState(false)

  // Dropdown states
  const [isParentDropdownOpen, setIsParentDropdownOpen] = useState(false)
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false)

  // Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch existing category
  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ["category", categoryId],
    queryFn: () => getCategory(categoryId),
    enabled: !!categoryId,
  })

  // Fetch categories for parent dropdown
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(CreateCategorySchema) as Resolver<CategoryFormData>,
    defaultValues: {
      name: "",
      handle: "",
      description: "",
      is_active: true,
      is_internal: false,
      parent_category_id: null,
    },
  })

  const categoryName = watch("name")
  const selectedParentId = watch("parent_category_id")
  const isActive = watch("is_active")

  // Populate form with existing category data
  useEffect(() => {
    if (categoryData && !isInitialized) {
      setValue("name", categoryData.name || "")
      setValue("handle", categoryData.handle || "")
      setValue("description", categoryData.description || "")
      setValue("is_active", categoryData.is_active ?? true)
      setValue("is_internal", categoryData.is_internal ?? false)
      setValue("parent_category_id", categoryData.parent_category?.id || null)

      // Set existing image URL from metadata
      if (categoryData.metadata && typeof categoryData.metadata === 'object' && 'image_url' in categoryData.metadata) {
        setExistingImageUrl(categoryData.metadata.image_url as string)
      }

      setIsInitialized(true)
    }
  }, [categoryData, isInitialized, setValue])

  // Handle image file selection
  const handleImageChange = (file: File | null): void => {
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

    setImageFile(file)
    const preview = URL.createObjectURL(file)
    setImagePreview(preview)
    setExistingImageUrl(null) // Clear existing image when new file is selected
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
      handleImageChange(file)
    }
  }

  const handleRemoveImage = (): void => {
    setImageFile(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
      setImagePreview(null)
    }
    setExistingImageUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Get the current image to display (new upload preview or existing)
  const currentImageUrl = imagePreview || existingImageUrl

  // Get selected parent category name for display
  // Exclude current category from parent options
  const availableParentCategories = categoriesData?.product_categories.filter(
    (cat) => cat.id !== categoryId
  )
  const selectedParentCategory = availableParentCategories?.find(
    (cat) => cat.id === selectedParentId
  )

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      let imageUrl: string | undefined = existingImageUrl || undefined

      // Upload new image if file is selected
      if (imageFile) {
        setIsUploading(true)
        try {
          imageUrl = await uploadFile(imageFile)
        } catch (error) {
          console.error("Failed to upload image:", error)
          throw new Error("Failed to upload image")
        } finally {
          setIsUploading(false)
        }
      } else if (!currentImageUrl) {
        imageUrl = undefined
      }

      return updateCategory(categoryId, {
        name: data.name,
        handle: data.handle,
        description: data.description || undefined,
        is_active: data.is_active ?? true,
        is_internal: data.is_internal ?? false,
        parent_category_id: data.parent_category_id || undefined,
        metadata: imageUrl ? { image_url: imageUrl } : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      queryClient.invalidateQueries({ queryKey: ["category", categoryId] })
      showToast("Category updated successfully!", "success")
      router.push("/admin/categories")
    },
    onError: (error) => {
      console.error("Failed to update category:", error)
      showToast("Failed to update category. Please try again.", "error")
    },
  })

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async () => {
      return deleteCategory(categoryId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      showToast("Category deleted successfully!", "success")
      router.push("/admin/categories")
    },
    onError: (error) => {
      console.error("Failed to delete category:", error)
      showToast("Failed to delete category. Please try again.", "error")
    },
  })

  const onSubmit = (data: CategoryFormData): void => {
    updateCategoryMutation.mutate(data)
  }

  // Generate display ID for category (last 4 digits for modal)
  const getCategoryDisplayId = (id: string): string => {
    if (id.length > 4) {
      return id.slice(-4)
    }
    return id
  }

  const handleDelete = async (): Promise<void> => {
    const confirmed = await confirm({
      title: "Delete Category",
      message: "Are you sure you want to delete this category?",
      confirmText: "Delete",
      cancelText: "Cancel",
      categoryDetails: {
        categoryId: getCategoryDisplayId(categoryId),
        categoryName: categoryData?.name || "",
      },
    })

    if (confirmed) {
      deleteCategoryMutation.mutate()
    }
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest("[data-dropdown]")) {
        setIsParentDropdownOpen(false)
        setIsStatusDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Loading state
  if (categoryLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-4 md:px-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E5E7EB] border-t-[#030712]" />
          <p className="font-geist text-[14px] text-[#6A7282]">Loading category...</p>
        </div>
      </div>
    )
  }

  // Not found state
  if (!categoryLoading && !categoryData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center px-4 md:px-8">
        <div className="flex flex-col items-center gap-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15 9L9 15M9 9L15 15" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="font-geist text-[16px] font-medium text-[#030712]">Category not found</p>
          <button
            onClick={() => router.push("/admin/categories")}
            className="cursor-pointer rounded-lg bg-[#030712] px-4 py-2 font-geist text-[14px] font-medium text-white transition-colors hover:bg-[#1F2937]"
          >
            Back to Categories
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => router.push("/admin/categories")}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#E5E7EB] bg-white transition-colors hover:bg-[#F9FAFB]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="font-geist text-[16px] font-medium leading-[120%] tracking-[-0.32px] text-[#030712]">
            Edit Category
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteCategoryMutation.isPending}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#E5E7EB] bg-white transition-colors hover:bg-[#FEF2F2] hover:border-[#FECACA] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M16.875 4.375H3.125M8.125 8.125V13.125M11.875 8.125V13.125M15.625 4.375V16.25C15.625 16.5815 15.4933 16.8995 15.2589 17.1339C15.0245 17.3683 14.7065 17.5 14.375 17.5H5.625C5.29348 17.5 4.97554 17.3683 4.74112 17.1339C4.5067 16.8995 4.375 16.5815 4.375 16.25V4.375M13.125 4.375V3.125C13.125 2.79348 12.9933 2.47554 12.7589 2.24112C12.5245 2.0067 12.2065 1.875 11.875 1.875H8.125C7.79348 1.875 7.47554 2.0067 7.24112 2.24112C7.0067 2.47554 6.875 2.79348 6.875 3.125V4.375" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={updateCategoryMutation.isPending}
            className="cursor-pointer rounded-lg bg-[#2F2F2F] px-4 py-2.5 text-center font-geist text-[14px] font-medium tracking-[-0.14px] text-white transition-colors hover:bg-[#3D3D3D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updateCategoryMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
        <h2 className="mb-6 font-geist text-[16px] font-medium leading-[150%] tracking-[-0.16px] text-[#020817]">
          Category
        </h2>

        <form id="edit-category-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Category Name */}
            <div>
              <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                Category Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.66667 8.33333H4.16667C3.24583 8.33333 2.5 7.5875 2.5 6.66667V4.16667C2.5 3.24583 3.24583 2.5 4.16667 2.5H6.66667C7.5875 2.5 8.33333 3.24583 8.33333 4.16667V6.66667C8.33333 7.5875 7.5875 8.33333 6.66667 8.33333Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M15.8341 8.33333H13.3341C12.4133 8.33333 11.6675 7.5875 11.6675 6.66667V4.16667C11.6675 3.24583 12.4133 2.5 13.3341 2.5H15.8341C16.755 2.5 17.5008 3.24583 17.5008 4.16667V6.66667C17.5008 7.5875 16.755 8.33333 15.8341 8.33333Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.66667 17.4996H4.16667C3.24583 17.4996 2.5 16.7538 2.5 15.8329V13.3329C2.5 12.4121 3.24583 11.6663 4.16667 11.6663H6.66667C7.5875 11.6663 8.33333 12.4121 8.33333 13.3329V15.8329C8.33333 16.7538 7.5875 17.4996 6.66667 17.4996Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16.6667 12.9581H12.5" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.5 16.2089H16.6667" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Enter category name"
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

            {/* Slug */}
            <div>
              <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                Slug
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.66667 8.33333H4.16667C3.24583 8.33333 2.5 7.5875 2.5 6.66667V4.16667C2.5 3.24583 3.24583 2.5 4.16667 2.5H6.66667C7.5875 2.5 8.33333 3.24583 8.33333 4.16667V6.66667C8.33333 7.5875 7.5875 8.33333 6.66667 8.33333Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M15.8341 8.33333H13.3341C12.4133 8.33333 11.6675 7.5875 11.6675 6.66667V4.16667C11.6675 3.24583 12.4133 2.5 13.3341 2.5H15.8341C16.755 2.5 17.5008 3.24583 17.5008 4.16667V6.66667C17.5008 7.5875 16.755 8.33333 15.8341 8.33333Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.66667 17.4996H4.16667C3.24583 17.4996 2.5 16.7538 2.5 15.8329V13.3329C2.5 12.4121 3.24583 11.6663 4.16667 11.6663H6.66667C7.5875 11.6663 8.33333 12.4121 8.33333 13.3329V15.8329C8.33333 16.7538 7.5875 17.4996 6.66667 17.4996Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16.6667 12.9581H12.5" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.5 16.2089H16.6667" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Enter category slug"
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

            {/* Parent Category */}
            <div data-dropdown>
              <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                Parent Category
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.66667 8.33333H4.16667C3.24583 8.33333 2.5 7.5875 2.5 6.66667V4.16667C2.5 3.24583 3.24583 2.5 4.16667 2.5H6.66667C7.5875 2.5 8.33333 3.24583 8.33333 4.16667V6.66667C8.33333 7.5875 7.5875 8.33333 6.66667 8.33333Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M15.8341 8.33333H13.3341C12.4133 8.33333 11.6675 7.5875 11.6675 6.66667V4.16667C11.6675 3.24583 12.4133 2.5 13.3341 2.5H15.8341C16.755 2.5 17.5008 3.24583 17.5008 4.16667V6.66667C17.5008 7.5875 16.755 8.33333 15.8341 8.33333Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.66667 17.4996H4.16667C3.24583 17.4996 2.5 16.7538 2.5 15.8329V13.3329C2.5 12.4121 3.24583 11.6663 4.16667 11.6663H6.66667C7.5875 11.6663 8.33333 12.4121 8.33333 13.3329V15.8329C8.33333 16.7538 7.5875 17.4996 6.66667 17.4996Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16.6667 12.9581H12.5" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.5 16.2089H16.6667" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => setIsParentDropdownOpen(!isParentDropdownOpen)}
                  disabled={categoriesLoading}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-4 text-left font-geist text-[16px] font-normal tracking-[-0.16px] outline-none transition-colors hover:border-[#999] focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className={selectedParentCategory ? "text-[#030712]" : "text-[#6A7282]"}>
                    {categoriesLoading
                      ? "Loading..."
                      : selectedParentCategory
                      ? selectedParentCategory.name
                      : "Choose product category parent"}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    className={`transition-transform ${isParentDropdownOpen ? "rotate-180" : ""}`}
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

                {/* Parent Category Dropdown */}
                {isParentDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-[#E5E7EB] bg-white shadow-lg">
                    {/* None option */}
                    <button
                      type="button"
                      onClick={() => {
                        setValue("parent_category_id", null)
                        setIsParentDropdownOpen(false)
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left font-geist text-[14px] text-[#6A7282] transition-colors hover:bg-[#F9FAFB]"
                    >
                      None (Root Category)
                    </button>
                    {availableParentCategories?.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setValue("parent_category_id", category.id)
                          setIsParentDropdownOpen(false)
                        }}
                        className={`flex w-full items-center gap-2 px-4 py-3 text-left font-geist text-[14px] transition-colors hover:bg-[#F9FAFB] ${
                          selectedParentId === category.id
                            ? "bg-[#F9FAFB] text-[#030712]"
                            : "text-[#030712]"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.parent_category_id && (
                <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                  {errors.parent_category_id.message}
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
                        setValue("is_active", true)
                        setIsStatusDropdownOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-3 text-left font-geist text-[14px] transition-colors hover:bg-[#F9FAFB] ${
                        isActive ? "bg-[#F9FAFB] text-[#030712]" : "text-[#030712]"
                      }`}
                    >
                      <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValue("is_active", false)
                        setIsStatusDropdownOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-3 text-left font-geist text-[14px] transition-colors hover:bg-[#F9FAFB] ${
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

            {/* Description - Full Width */}
            <div className="lg:col-span-2">
              <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                Description
              </label>
              <textarea
                placeholder="Enter product description"
                {...register("description")}
                rows={10}
                className="w-full resize-none rounded-lg border border-[#E3E3E3] bg-white p-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
              />
              {errors.description && (
                <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Category Image */}
            <div className="lg:col-span-2">
              <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                Category Image
              </label>
              
              {!currentImageUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                    isDragging
                      ? "border-[#2F2F2F] bg-[#F9FAFB]"
                      : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB]"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 8L12 3L7 8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 3V15" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="mb-1 font-geist text-[14px] font-medium text-[#030712]">
                    Click to upload or drag and drop
                  </p>
                  <p className="font-geist text-[12px] text-[#6B7280]">
                    PNG, JPG, GIF up to 5MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[#E5E7EB]">
                  <img
                    src={currentImageUrl}
                    alt="Category preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-colors hover:bg-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M12 4L4 12M4 4L12 12" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
