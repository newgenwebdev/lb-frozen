"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/contexts/ToastContext";
import {
  ProductSchema,
  ProductFormData,
  ProductVariantFormData,
  ProductOptionFormData,
  WholesalePriceFormData,
  WholesaleTierFormData,
  generateHandle,
  convertPriceToCents,
  generateVariantSku,
} from "@/lib/validators/product";
import { createProduct, getProduct, updateOptionMetadata, getDefaultSalesChannel, getDefaultShippingProfile } from "@/lib/api/products";
import { uploadFile, uploadFiles } from "@/lib/api/uploads";
import { getCategories } from "@/lib/api/categories";
import { getBrands } from "@/lib/api/brands";
import { getStockLocations, setupVariantInventory } from "@/lib/api/inventory";
import {
  VariantOptionsInput,
  VariantTable,
} from "@/components/admin/products";
import type { OptionImage } from "@/components/admin/products";

// Gallery image type for tracking file and preview
type GalleryImage = {
  id: string;
  file: File;
  preview: string;
};

export default function AddProductPage(): React.JSX.Element {
  const router = useRouter();
  const { showToast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gallery images state
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [isGalleryDragging, setIsGalleryDragging] = useState<boolean>(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Variant management state
  const [hasVariants, setHasVariants] = useState<boolean>(false);
  const [variantTypes, setVariantTypes] = useState<
    Array<{ type: string; values: string[]; addPictures: boolean }>
  >([]);
  const [variants, setVariants] = useState<ProductVariantFormData[]>([]);
  // Option images: Map of variantType -> { optionValue -> OptionImage }
  const [optionImages, setOptionImages] = useState<Record<string, Record<string, OptionImage>>>({});

  // Handle option image upload
  const handleOptionImageChange = (variantType: string, optionValue: string, file: File | null) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setOptionImages(prev => ({
      ...prev,
      [variantType]: {
        ...prev[variantType],
        [optionValue]: { file, preview }
      }
    }));
  };

  const [globalDiscountEnabled, setGlobalDiscountEnabled] = useState<boolean>(false);
  const [globalDiscountType, setGlobalDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);

  // Product metadata fields
  const [rating, setRating] = useState<string>("");
  const [soldCount, setSoldCount] = useState<string>("");
  const [onSale, setOnSale] = useState<boolean>(false);
  const [flashSale, setFlashSale] = useState<boolean>(false);
  const [trending, setTrending] = useState<boolean>(false);
  const [onBrand, setOnBrand] = useState<boolean>(false);
  const [dealsRank, setDealsRank] = useState<string>("");
  const [shippingDays, setShippingDays] = useState<string>("24-48");
  const [freeShipping, setFreeShipping] = useState<boolean>(true);
  const [shippingMethod, setShippingMethod] = useState<string>("Standard");

  // Fetch categories for dropdown
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
  });

  // Fetch brands for dropdown
  const { data: brandsData, isLoading: brandsLoading } = useQuery({
    queryKey: ["brands", { is_active: true }],
    queryFn: () => getBrands({ is_active: true }),
  });

  // Fetch stock locations for dropdown
  const { data: stockLocationsData, isLoading: stockLocationsLoading } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: () => getStockLocations(),
  });

  // Fetch default sales channel (required for products to appear in storefront)
  const { data: defaultSalesChannel } = useQuery({
    queryKey: ["default-sales-channel"],
    queryFn: () => getDefaultSalesChannel(),
  });

  // Fetch default shipping profile (required for checkout to work)
  const { data: defaultShippingProfile } = useQuery({
    queryKey: ["default-shipping-profile"],
    queryFn: () => getDefaultShippingProfile(),
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(ProductSchema) as Resolver<ProductFormData>,
    defaultValues: {
      productName: "",
      handle: "",
      category: "",
      brand: "",
      status: "draft" as const,
      description: "",
      availableQuantity: "",
      minimumStockAlert: "",
      inventoryLocation: "",
      basePrice: "",
      discountPercentage: "",
      discountType: "",
      hasVariants: false,
      hasGlobalDiscount: false,
      options: [],
      variants: [],
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = form;

  const productName = watch("productName");

  // Auto-generate handle from product name
  useEffect(() => {
    if (productName) {
      const handle = generateHandle(productName);
      setValue("handle", handle);
    }
  }, [productName, setValue]);

  // Auto-add one variant field when toggle is enabled
  useEffect(() => {
    if (hasVariants && variantTypes.length === 0) {
      setVariantTypes([{ type: "", values: [], addPictures: false }]);
    } else if (!hasVariants && variantTypes.length > 0) {
      setVariantTypes([]);
      setVariants([]);
    }
  }, [hasVariants]);

  // Generate variants when options change
  useEffect(() => {
    if (variantTypes.length > 0 && hasVariants) {
      generateVariants();
    }
  }, [variantTypes, hasVariants]);

  // Sync hasVariants state to form
  useEffect(() => {
    setValue("hasVariants", hasVariants);
  }, [hasVariants, setValue]);

  // Sync variants and options to form when they change
  useEffect(() => {
    if (hasVariants) {
      // Sync options to form
      const formOptions = variantTypes
        .filter(vt => vt.type && vt.values.length > 0)
        .map(vt => ({
          title: vt.type,
          values: vt.values,
        }));
      setValue("options", formOptions);

      // Sync variants to form
      setValue("variants", variants);
    }
  }, [hasVariants, variantTypes, variants, setValue]);

  // Generate all variant combinations from options
  const generateVariants = (): void => {
    if (variantTypes.length === 0) {
      setVariants([]);
      return;
    }

    // Generate cartesian product of all option values
    const combinations: Array<Record<string, string>> = [];
    const generateCombinations = (
      index: number,
      current: Record<string, string>
    ): void => {
      if (index === variantTypes.length) {
        combinations.push({ ...current });
        return;
      }

      const { type, values } = variantTypes[index];
      for (const value of values) {
        current[type] = value;
        generateCombinations(index + 1, current);
      }
    };

    generateCombinations(0, {});

    // Create variant objects
    const productHandle = form.getValues("handle") || generateHandle(form.getValues("productName") || "product");
    const newVariants: ProductVariantFormData[] = combinations.map((combo) => {
      const title = Object.values(combo).join(" / ");
      const existingVariant = variants.find((v) => v.title === title);

      return (
        existingVariant || {
          title,
          sku: generateVariantSku(productHandle, title),
          prices: [{ currency_code: "sgd", amount: 0 }],
          options: combo,
          manage_inventory: true,
          allow_backorder: false,
          inventory_quantity: 0,
          discount: 0,
          wholesaleEnabled: false,
          wholesaleTiers: [],
        }
      );
    });

    setVariants(newVariants);
  };

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      // Step 1: Upload main product image
      let thumbnailUrl: string | undefined;
      if (data.productImage) {
        thumbnailUrl = await uploadFile(data.productImage);
      }

      // Step 1b: Upload gallery images
      let galleryImageUrls: string[] = [];
      if (galleryImages.length > 0) {
        const galleryFiles = galleryImages.map((img) => img.file);
        galleryImageUrls = await uploadFiles(galleryFiles);
      }

      // Step 2: Upload variant images
      const variantsWithImages = variants.filter((v) => v.image);
      const variantImageUrls: string[] = [];
      if (variantsWithImages.length > 0) {
        const imageFiles = variantsWithImages.map((v) => v.image!);
        const urls = await uploadFiles(imageFiles);
        variantImageUrls.push(...urls);
      }

      // Step 3: Helper function to calculate max quantity for wholesale tiers
      const calculateMaxQty = (tiers: WholesaleTierFormData[], index: number): number | undefined => {
        if (index === tiers.length - 1) {
          // Last tier has no max (unlimited)
          return undefined;
        }
        const nextTier = tiers[index + 1];
        if (nextTier && nextTier.minQty > tiers[index].minQty) {
          return nextTier.minQty - 1;
        }
        return undefined;
      };

      // Step 4: Prepare variants with uploaded image URLs and variant-level wholesale pricing
      const preparedVariants = variants.map((variant, index) => {
        const imageUrlIndex = variantsWithImages.findIndex(
          (v) => v.title === variant.title
        );

        // Build prices array - start with the base price
        const basePrices = variant.prices.map((p) => ({
          currency_code: p.currency_code,
          amount: p.amount,
        }));

        // Add variant-level wholesale tier prices if enabled for this variant
        const allPrices = [...basePrices];
        if (variant.wholesaleEnabled && variant.wholesaleTiers && variant.wholesaleTiers.length > 0) {
          // Sort tiers by minQty to ensure proper order
          const sortedTiers = [...variant.wholesaleTiers].sort((a, b) => a.minQty - b.minQty);

          sortedTiers.forEach((tier, tierIndex) => {
            const maxQty = calculateMaxQty(sortedTiers, tierIndex);
            const wholesalePrice: WholesalePriceFormData = {
              currency_code: "sgd",
              amount: tier.price,
              min_quantity: tier.minQty,
              max_quantity: maxQty ?? null,
            };
            allPrices.push(wholesalePrice);
          });
        }

        // Generate SKU if not set
        const productHandle = data.handle || generateHandle(data.productName);
        const variantSku = variant.sku || generateVariantSku(productHandle, variant.title);

        return {
          title: variant.title,
          sku: variantSku,
          prices: allPrices,
          options: variant.options as Record<string, string> | undefined,
          manage_inventory: variant.manage_inventory,
          allow_backorder: variant.allow_backorder,
          inventory_quantity: variant.inventory_quantity,
          weight: variant.weight,
          metadata: {
            imageUrl:
              imageUrlIndex >= 0
                ? variantImageUrls[imageUrlIndex]
                : undefined,
            min_stock_alert: variant.min_stock_alert || 0,
            // Use global discount if enabled, otherwise use individual variant discount
            discount: globalDiscountEnabled ? globalDiscountValue : (variant.discount || 0),
            discount_type: globalDiscountEnabled ? globalDiscountType : "percentage",
          },
        };
      });

      // Step 5: Upload option images and prepare options for Medusa
      const optionImageUrlsMap: Record<string, Record<string, string>> = {};

      // Upload all option images
      for (const variantType of variantTypes) {
        if (variantType.addPictures && optionImages[variantType.type]) {
          optionImageUrlsMap[variantType.type] = {};
          for (const [optionValue, imageData] of Object.entries(optionImages[variantType.type])) {
            if (imageData.file) {
              // Upload the file
              const uploadedUrl = await uploadFile(imageData.file);
              optionImageUrlsMap[variantType.type][optionValue] = uploadedUrl;
            }
          }
        }
      }

      const options: Array<{ title: string; values: string[]; metadata?: Record<string, unknown> }> =
        variantTypes.map((vt) => ({
          title: vt.type,
          values: vt.values,
          metadata: optionImageUrlsMap[vt.type]
            ? { images: optionImageUrlsMap[vt.type] }
            : undefined,
        }));

      // Step 6: Build default variant prices for non-variant products
      // Note: Wholesale tier pricing requires variants - non-variant products only have base price
      const buildDefaultVariantPrices = () => {
        return [
          {
            currency_code: "sgd",
            amount: convertPriceToCents(data.basePrice || "0"),
          },
        ];
      };

      // Step 7: Create product (without inventory_quantity - Medusa 2.x ignores it)
      const productPayload = {
        title: data.productName,
        handle: data.handle,
        description: data.description,
        status: data.status,
        thumbnail: thumbnailUrl,
        images: (() => {
          const imageList: Array<{ url: string }> = [];
          if (thumbnailUrl) {
            imageList.push({ url: thumbnailUrl });
          }
          galleryImageUrls.forEach((url) => {
            imageList.push({ url });
          });
          return imageList.length > 0 ? imageList : undefined;
        })(),
        categories: data.category ? [{ id: data.category }] : undefined,
        options: hasVariants ? options : [{ title: "Default", values: ["Standard"] }],
        variants: hasVariants
          ? preparedVariants.map(v => ({
              title: v.title,
              sku: v.sku,
              prices: v.prices,
              options: v.options,
              manage_inventory: v.manage_inventory,
              allow_backorder: v.allow_backorder,
              weight: v.weight,
              metadata: v.metadata,
            }))
          : [
              {
                title: "Default",
                sku: data.handle,
                prices: buildDefaultVariantPrices(),
                options: { Default: "Standard" },
                manage_inventory: true,
                weight: data.weight,
                metadata: {
                  min_stock_alert: parseInt(data.minimumStockAlert || "0"),
                  discount: globalDiscountEnabled ? globalDiscountValue : 0,
                  discount_type: globalDiscountEnabled ? globalDiscountType : "percentage",
                },
              },
            ],
        metadata: {
          minimumStockAlert: data.minimumStockAlert,
          // Save inventory location so it can be restored when editing
          inventoryLocation: data.inventoryLocation,
          // Brand association
          brand_id: data.brand || null,
          // Store display metadata
          rating: rating ? parseFloat(rating) : undefined,
          sold_count: soldCount ? parseInt(soldCount) : undefined,
          // Badge and deals metadata
          on_sale: onSale,
          flash_sale: flashSale,
          trending: trending,
          on_brand: onBrand,
          deals_rank: dealsRank ? parseInt(dealsRank) : undefined,
          // Shipping metadata
          shipping_days: shippingDays,
          free_shipping: freeShipping,
          shipping_method: shippingMethod,
        },
        // Link to sales channel so product appears in storefront
        sales_channels: defaultSalesChannel ? [{ id: defaultSalesChannel.id }] : undefined,
        // Link to shipping profile so checkout works
        shipping_profile_id: defaultShippingProfile?.id,
      };

      let product = await createProduct(productPayload);

      // Step 8: Save option images to metadata using separate API endpoint
      // (Medusa doesn't support setting option metadata through product create)
      if (hasVariants && Object.keys(optionImageUrlsMap).length > 0) {
        // Re-fetch the product to get options with IDs (createProduct may not return them)
        const createdProduct = await getProduct(product.id);
        if (createdProduct.options && createdProduct.options.length > 0) {
          for (const option of createdProduct.options) {
            const imagesForOption = optionImageUrlsMap[option.title];
            if (imagesForOption && Object.keys(imagesForOption).length > 0) {
              try {
                await updateOptionMetadata(product.id, option.id, {
                  images: imagesForOption,
                });
              } catch (error) {
                console.error(`Failed to update option metadata for ${option.title}:`, error);
                // Continue with other options even if one fails
              }
            }
          }
          // Use the refetched product for subsequent operations
          product = createdProduct;
        }
      }

      // Step 9: Setup inventory for each variant (Medusa 2.x Inventory Module)
      const inventoryResults: { success: string[]; failed: Array<{ title: string; error: string }> } = {
        success: [],
        failed: [],
      };

      const selectedLocationId = data.inventoryLocation;
      if (selectedLocationId && product.variants) {
        const inventoryPromises = product.variants.map((variant, index) => {
          const quantity = hasVariants
            ? variants[index]?.inventory_quantity || 0
            : parseInt(data.availableQuantity || "0");

          if (quantity > 0) {
            return setupVariantInventory(
              { id: variant.id, sku: variant.sku || undefined, title: variant.title },
              quantity,
              selectedLocationId,
              product.id // Pass productId for inventory linking
            ).then((result) => {
              if (result.success) {
                inventoryResults.success.push(variant.title);
              } else {
                inventoryResults.failed.push({
                  title: variant.title,
                  error: result.error || "Unknown error",
                });
              }
            });
          }
          return Promise.resolve();
        });

        await Promise.all(inventoryPromises);
      }

      return { product, inventoryResults };
    },
    onSuccess: ({ product, inventoryResults }) => {
      if (inventoryResults.failed.length > 0) {
        showToast(
          `Product created! But inventory setup failed for: ${inventoryResults.failed
            .map((f) => f.title)
            .join(", ")}`,
          "warning"
        );
      } else {
        showToast("Product created successfully!", "success");
      }
      router.push("/admin/products");
    },
    onError: (error) => {
      console.error("Failed to create product:", error);
      showToast("Failed to create product. Please try again.", "error");
    },
  });

  const onSubmit = (data: ProductFormData): void => {
    createProductMutation.mutate(data);
  };

  const handleImageChange = (file: File | null): void => {
    if (file) {
      setValue("productImage", file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp" || file.type === "image/heic")) {
      handleImageChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (): void => {
    setIsDragging(false);
  };

  // Gallery image handlers
  const handleGalleryImageAdd = (files: FileList | null): void => {
    if (!files) return;
    const newImages: GalleryImage[] = [];
    Array.from(files).forEach((file) => {
      if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp" || file.type === "image/heic") {
        const preview = URL.createObjectURL(file);
        newImages.push({
          id: `gallery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
        });
      }
    });
    setGalleryImages((prev) => [...prev, ...newImages]);
  };

  const handleGalleryImageRemove = (id: string): void => {
    setGalleryImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleGalleryDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsGalleryDragging(false);
    handleGalleryImageAdd(e.dataTransfer.files);
  };

  const handleGalleryDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsGalleryDragging(true);
  };

  const handleGalleryDragLeave = (): void => {
    setIsGalleryDragging(false);
  };

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
            Products
          </h1>
          <p className="mt-1 font-geist text-[14px] text-[#6A7282]">
            Add New Product
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 transition-colors hover:bg-[#F9FAFB]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4L12 12" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-geist text-[14px] font-medium text-[#6A7282]">Cancel</span>
          </button>
          <button
            type="submit"
            form="add-product-form"
            disabled={createProductMutation.isPending}
            className="cursor-pointer rounded-[9px] border-t border-[rgba(255,255,255,0.30)] bg-[#2F2F2F] px-4 py-2 text-center font-geist text-[14px] font-medium tracking-[-0.14px] text-white transition-colors hover:bg-[#3D3D3D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createProductMutation.isPending ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-6 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-4">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 mt-0.5">
              <path d="M10 18.3337C14.6024 18.3337 18.3334 14.6027 18.3334 10.0003C18.3334 5.39795 14.6024 1.66699 10 1.66699C5.39765 1.66699 1.66669 5.39795 1.66669 10.0003C1.66669 14.6027 5.39765 18.3337 10 18.3337Z" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 6.66699V10.0003" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 13.333H10.0083" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <p className="font-geist text-[14px] font-medium text-[#DC2626]">
                Please fix the following errors:
              </p>
              <ul className="mt-1 list-disc pl-5 font-geist text-[13px] text-[#B91C1C]">
                {errors.productName && <li>{errors.productName.message}</li>}
                {errors.category && <li>{errors.category.message}</li>}
                {errors.description && <li>{errors.description.message}</li>}
                {errors.hasVariants && <li>{errors.hasVariants.message}</li>}
                {errors.basePrice && <li>Base price: {errors.basePrice.message}</li>}
                {errors.availableQuantity && <li>Available quantity: {errors.availableQuantity.message}</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form id="add-product-form" onSubmit={handleSubmit(onSubmit)}>
        {/* Product Information Section */}
        <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
          <h2 className="mb-6 font-geist text-[16px] font-medium leading-[150%] tracking-[-0.16px] text-[#020817]">
            Product Information
          </h2>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Product Image */}
            <div className="lg:col-span-1">
              <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                Product Image
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                  isDragging
                    ? "border-[#030712] bg-[#F9FAFB]"
                    : "border-[#E5E5E5] bg-[#FAFAFA] hover:bg-[#F5F5F5]"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="relative h-full w-full group">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-full w-full rounded-lg object-contain"
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 8L12 3L7 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 3V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="mt-2 font-geist text-[14px] font-medium text-white">
                        Change Image
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <g clipPath="url(#clip0_25591_82965)">
                          <path d="M9.37402 10.6748C9.59423 10.6748 9.80667 10.7514 9.97559 10.8896L10.0459 10.9531L10.1084 11.0225C10.247 11.1915 10.3232 11.4045 10.3232 11.625V11.9492C10.3234 12.9052 11.1075 13.6918 12.0312 13.6748L12.1943 13.6641C12.5725 13.6197 12.9264 13.447 13.1953 13.1729C13.5024 12.8596 13.6748 12.4386 13.6748 12V11.625C13.6748 11.3732 13.7742 11.1312 13.9521 10.9531C14.1302 10.775 14.3722 10.6748 14.624 10.6748L20.999 10.6748C21.5491 10.6748 22.0768 10.8934 22.4658 11.2822C22.8549 11.6713 23.0732 12.1998 23.0732 12.75V18.75C23.0731 19.3001 22.8548 19.8278 22.4658 20.2168C22.0768 20.6057 21.5491 20.8242 20.999 20.8242H2.99902C2.4489 20.8242 1.92127 20.6057 1.53223 20.2168C1.14326 19.8278 0.924907 19.3001 0.924805 18.75L0.924805 12.75C0.924805 12.1998 1.14317 11.6713 1.53223 11.2822C1.92126 10.8934 2.44895 10.6748 2.99902 10.6748H9.37402ZM17.5166 15.21C17.4099 15.2312 17.3113 15.2834 17.2344 15.3604C17.1575 15.4373 17.1052 15.5359 17.084 15.6426C17.0629 15.7491 17.0737 15.8596 17.1152 15.96C17.1569 16.0605 17.2279 16.1466 17.3184 16.207C17.4089 16.2675 17.5152 16.2998 17.624 16.2998C17.77 16.2998 17.9104 16.2419 18.0137 16.1387C18.1166 16.0356 18.1747 15.8957 18.1748 15.75C18.1748 15.6411 18.1425 15.5339 18.082 15.4434C18.0216 15.353 17.9354 15.2829 17.835 15.2412C17.7344 15.1996 17.6234 15.1887 17.5166 15.21ZM11.999 0.924805C12.173 0.924805 12.3452 0.958827 12.5059 1.02539C12.6666 1.09204 12.8135 1.18936 12.9365 1.3125L12.9355 1.31348L17.4355 5.8125C17.684 6.06098 17.8242 6.39859 17.8242 6.75C17.8241 7.05712 17.7173 7.35327 17.5244 7.58887L17.4355 7.68652C17.1871 7.93489 16.8503 8.07422 16.499 8.07422C16.1477 8.07422 15.811 7.93489 15.5625 7.68652L13.3232 5.44629V12C13.3231 12.3512 13.1839 12.6882 12.9355 12.9365C12.6872 13.1848 12.3502 13.3242 11.999 13.3242C11.6478 13.3242 11.3109 13.1848 11.0625 12.9365C10.8142 12.6882 10.6749 12.3512 10.6748 12V5.44629L8.43555 7.68555L8.43652 7.68652C8.3135 7.80968 8.16666 7.90698 8.00586 7.97363C7.84514 8.04021 7.67299 8.0752 7.49902 8.0752C7.32505 8.0752 7.15291 8.04022 6.99219 7.97363C6.83139 7.90698 6.68454 7.80968 6.56152 7.68652V7.68555C6.43884 7.56274 6.34089 7.41719 6.27441 7.25684C6.20785 7.0962 6.17388 6.92388 6.17383 6.75C6.17383 6.57593 6.20776 6.40299 6.27441 6.24219C6.34107 6.0814 6.43935 5.93551 6.5625 5.8125L11.0615 1.31348V1.3125C11.1845 1.18936 11.3314 1.09204 11.4922 1.02539C11.6529 0.958827 11.8251 0.924805 11.999 0.924805Z" fill="#030712" stroke="white" strokeWidth="1.14914"/>
                        </g>
                        <defs>
                          <clipPath id="clip0_25591_82965">
                            <rect width="24" height="24" fill="white"/>
                          </clipPath>
                        </defs>
                      </svg>
                    </div>
                    <p className="mb-1 font-public text-[14px] font-medium text-[#030712]">
                      Drag your image here or browse here
                    </p>
                    <p className="font-public text-[12px] text-[#6A7282]">
                      Format is JPG, PNG, WEBP or HEIC.
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageChange(file);
                  }}
                />
              </div>
              <p className="mt-2 flex items-center gap-1 font-public text-[14px] font-medium tracking-[-0.14px] text-[#6A7282]">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 8V6" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 4H6.005" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Minimum size: 1024 × 512 px.
              </p>
            </div>

            {/* Right side form fields */}
            <div className="grid grid-cols-1 gap-6 lg:col-span-2 lg:grid-cols-2">
              {/* Product Name */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Product Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M2.5 17.4997H17.5" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3.33362 17.5003L3.3337 9.12988" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16.7281 17.4996L16.7282 9.11719" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M18.1036 6.23138C18.3496 6.69455 18.3985 7.23728 18.2392 7.73694C17.9639 8.60377 17.1504 9.18563 16.2411 9.16619C15.3318 9.14675 14.5439 8.53065 14.3058 7.65284C14.2907 7.60186 14.2439 7.56687 14.1907 7.56687C14.1376 7.56687 14.0907 7.60186 14.0756 7.65284C13.8325 8.54629 13.0212 9.16626 12.0952 9.16616C11.1693 9.16606 10.3581 8.54592 10.1152 7.65242C10.1001 7.60141 10.0533 7.5664 10.0001 7.5664C9.94689 7.5664 9.90005 7.60141 9.88499 7.65242C9.64194 8.54592 8.83064 9.16598 7.90467 9.16595C6.9787 9.16592 6.16745 8.5458 5.92447 7.65228C5.90936 7.6013 5.86252 7.56634 5.80936 7.56634C5.75619 7.56634 5.70936 7.6013 5.69425 7.65228C5.45613 8.52999 4.66835 9.14601 3.75912 9.16548C2.84989 9.18495 2.03646 8.60322 1.76098 7.73651C1.6017 7.23677 1.65058 6.69392 1.89658 6.23067L3.31885 3.41518C3.60238 2.85391 4.17766 2.5 4.80648 2.5H15.1934C15.8222 2.5 16.3975 2.85392 16.681 3.41518L18.1036 6.23138Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M11.6667 17.4996V9.11719" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M11.6663 13.3337H3.33301" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter product name"
                    {...register("productName")}
                    className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                  />
                </div>
                {errors.productName && (
                  <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                    {errors.productName.message}
                  </p>
                )}
              </div>

              {/* Product Handle */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Product Handle (URL)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M8.75 11.25L11.25 8.75M8.19531 8.19659L7.5 7.5C6.30653 6.30653 4.36061 6.30653 3.16719 7.5C1.97372 8.69342 1.97372 10.6394 3.16719 11.8328C4.36061 13.0263 6.30653 13.0263 7.5 11.8328L8.19531 11.1375M11.8047 8.86344L12.5 8.16719C13.6935 6.97372 15.6394 6.97372 16.8328 8.16719C18.0263 9.36061 18.0263 11.3065 16.8328 12.5C15.6394 13.6935 13.6935 13.6935 12.5 12.5L11.8047 11.8047" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Auto-generated from product name"
                    {...register("handle")}
                    className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                  />
                </div>
                {errors.handle && (
                  <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                    {errors.handle.message}
                  </p>
                )}
                <p className="mt-1 font-public text-[12px] text-[#6A7282]">
                  URL-friendly identifier for this product
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Category
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path fillRule="evenodd" clipRule="evenodd" d="M6.45833 8.125H4.16667C3.24583 8.125 2.5 7.37917 2.5 6.45833V4.16667C2.5 3.24583 3.24583 2.5 4.16667 2.5H6.45833C7.37917 2.5 8.125 3.24583 8.125 4.16667V6.45833C8.125 7.37917 7.37917 8.125 6.45833 8.125Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M15.8333 8.125H13.5417C12.6208 8.125 11.875 7.37917 11.875 6.45833V4.16667C11.875 3.24583 12.6208 2.5 13.5417 2.5H15.8333C16.7542 2.5 17.5 3.24583 17.5 4.16667V6.45833C17.5 7.37917 16.7542 8.125 15.8333 8.125Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M6.45833 17.5H4.16667C3.24583 17.5 2.5 16.7542 2.5 15.8333V13.5417C2.5 12.6208 3.24583 11.875 4.16667 11.875H6.45833C7.37917 11.875 8.125 12.6208 8.125 13.5417V15.8333C8.125 16.7542 7.37917 17.5 6.45833 17.5Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path fillRule="evenodd" clipRule="evenodd" d="M15.8333 17.5H13.5417C12.6208 17.5 11.875 16.7542 11.875 15.8333V13.5417C11.875 12.6208 12.6208 11.875 13.5417 11.875H15.8333C16.7542 11.875 17.5 12.6208 17.5 13.5417V15.8333C17.5 16.7542 16.7542 17.5 15.8333 17.5Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <select
                    {...register("category")}
                    disabled={categoriesLoading}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-10 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors hover:border-[#999] focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {categoriesLoading ? "Loading categories..." : "Select a category"}
                    </option>
                    {categoriesData?.product_categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {/* Dropdown arrow */}
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M5 7.5L10 12.5L15 7.5"
                        stroke="#030712"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                {errors.category && (
                  <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                    {errors.category.message}
                  </p>
                )}
              </div>

              {/* Brand */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Brand
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2.5L12.5 7.5L17.5 8.125L13.75 11.875L14.75 17.5L10 14.625L5.25 17.5L6.25 11.875L2.5 8.125L7.5 7.5L10 2.5Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <select
                    {...register("brand")}
                    disabled={brandsLoading}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-10 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors hover:border-[#999] focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {brandsLoading ? "Loading brands..." : "Select a brand (optional)"}
                    </option>
                    {brandsData?.brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                  {/* Dropdown arrow */}
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M5 7.5L10 12.5L15 7.5"
                        stroke="#030712"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Status
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M13.3264 6.67372C15.1635 8.51081 15.1635 11.4893 13.3264 13.3264C11.4893 15.1635 8.51081 15.1635 6.67372 13.3264C4.83663 11.4893 4.83663 8.51081 6.67372 6.67372C8.51081 4.83663 11.4893 4.83663 13.3264 6.67372" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7.17708 16.9754C5.67291 16.3704 4.35291 15.2796 3.47874 13.7662C2.62291 12.2846 2.33624 10.6346 2.53874 9.05957" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5.37305 4.06708C6.64888 3.06708 8.25388 2.46875 10.0014 2.46875C11.7122 2.46875 13.2847 3.04542 14.5472 4.00792" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12.8262 16.9754C14.3303 16.3704 15.6503 15.2796 16.5245 13.7662C17.3803 12.2846 17.667 10.6346 17.4645 9.05957" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <select
                    {...register("status")}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-10 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors hover:border-[#999] focus:border-black"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M5 7.5L10 12.5L15 7.5"
                        stroke="#030712"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                {errors.status && (
                  <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                    {errors.status.message}
                  </p>
                )}
              </div>

              {/* Inventory Location - Always visible */}
              <div className="lg:col-span-2">
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Inventory Location
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5.00202 10.9648C3.47055 11.6518 2.50098 12.6455 2.50098 13.7552C2.50098 15.8269 5.85988 17.5067 10.0041 17.5067C14.1483 17.5067 17.5072 15.8269 17.5072 13.7552C17.5072 12.6455 16.5377 11.6518 15.0062 10.9648" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13.0482 14.1729C12.1448 14.7607 11.0805 15.0521 10.0036 15.0065C8.9267 15.0521 7.86241 14.7607 6.95898 14.1729" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M11.8384 3.26239C12.5816 4.00557 12.804 5.12327 12.4018 6.09431C11.9996 7.06535 11.052 7.69849 10.001 7.69849C8.94996 7.69849 8.00242 7.06535 7.60021 6.09431C7.19801 5.12327 7.42036 4.00557 8.16357 3.26239C8.65079 2.77488 9.31177 2.50098 10.001 2.50098C10.6902 2.50098 11.3512 2.77488 11.8384 3.26239" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M10.0038 7.69629V12.505" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <select
                    {...register("inventoryLocation")}
                    disabled={stockLocationsLoading}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-10 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors hover:border-[#999] focus:border-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {stockLocationsLoading ? "Loading locations..." : "Select inventory location"}
                    </option>
                    {stockLocationsData?.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M5 7.5L10 12.5L15 7.5"
                        stroke="#030712"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                {errors.inventoryLocation && (
                  <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                    {errors.inventoryLocation.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
              Description
            </label>
            <textarea
              placeholder="Enter product description"
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

          {/* Store Display Section */}
          <div className="mt-6">
            <h3 className="mb-4 font-geist text-[15px] font-medium tracking-[-0.15px] text-[#020817]">
              Store Display
            </h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Rating */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Rating
                  <span className="ml-2 font-geist text-[12px] font-normal text-[#6A7282]">(Optional)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g 4.5"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  step="0.1"
                  min="0"
                  max="5"
                  className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 px-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                />
                <p className="mt-1 font-geist text-[12px] text-[#6A7282]">
                  Product rating (0-5 stars)
                </p>
              </div>

              {/* Sold Count */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Sold Count
                  <span className="ml-2 font-geist text-[12px] font-normal text-[#6A7282]">(Optional)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g 1203"
                  value={soldCount}
                  onChange={(e) => setSoldCount(e.target.value)}
                  min="0"
                  className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 px-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                />
                <p className="mt-1 font-geist text-[12px] text-[#6A7282]">
                  Number of units sold
                </p>
              </div>
            </div>

            {/* Badges & Deals */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mt-6">
              {/* On Sale Toggle */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  On Sale Badge
                </label>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={onSale}
                      onChange={(e) => setOnSale(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#030712] peer-checked:after:translate-x-5"></div>
                  </label>
                  <span className="font-geist text-[14px] text-[#6A7282]">
                    Show &quot;On Sale&quot; badge
                  </span>
                </div>
              </div>

              {/* Flash Sale Toggle */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Flash Sale
                </label>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={flashSale}
                      onChange={(e) => setFlashSale(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#C52129] peer-checked:after:translate-x-5"></div>
                  </label>
                  <span className="font-geist text-[14px] text-[#6A7282]">
                    Show in Flash Sale section
                  </span>
                </div>
              </div>

              {/* Trending Toggle */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Trending
                </label>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={trending}
                      onChange={(e) => setTrending(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#F59E0B] peer-checked:after:translate-x-5"></div>
                  </label>
                  <span className="font-geist text-[14px] text-[#6A7282]">
                    Show &quot;Trending&quot; badge
                  </span>
                </div>
              </div>

              {/* On Brand Toggle */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  On Brand / Featured
                </label>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={onBrand}
                      onChange={(e) => setOnBrand(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#23429B] peer-checked:after:translate-x-5"></div>
                  </label>
                  <span className="font-geist text-[14px] text-[#6A7282]">
                    Show &quot;On Brand&quot; badge
                  </span>
                </div>
              </div>

              {/* Deals Rank */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Deals Rank
                  <span className="ml-2 font-geist text-[12px] font-normal text-[#6A7282]">(Optional)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g 2"
                  value={dealsRank}
                  onChange={(e) => setDealsRank(e.target.value)}
                  min="1"
                  className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 px-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                />
                <p className="mt-1 font-geist text-[12px] text-[#6A7282]">
                  Rank in &quot;Today Deals&quot; (e.g., No-2)
                </p>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mt-6">
              {/* Shipping Days */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Shipping Time
                </label>
                <input
                  type="text"
                  placeholder="e.g 24-48"
                  value={shippingDays}
                  onChange={(e) => setShippingDays(e.target.value)}
                  className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 px-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                />
                <p className="mt-1 font-geist text-[12px] text-[#6A7282]">
                  Hours to ship (e.g., 24-48)
                </p>
              </div>

              {/* Free Shipping */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Free Shipping
                </label>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={freeShipping}
                      onChange={(e) => setFreeShipping(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#030712] peer-checked:after:translate-x-5"></div>
                  </label>
                  <span className="font-geist text-[14px] text-[#6A7282]">
                    Free worldwide delivery
                  </span>
                </div>
              </div>

              {/* Shipping Method */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Shipping Method
                </label>
                <input
                  type="text"
                  placeholder="e.g Standard"
                  value={shippingMethod}
                  onChange={(e) => setShippingMethod(e.target.value)}
                  className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 px-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                />
                <p className="mt-1 font-geist text-[12px] text-[#6A7282]">
                  Shipping method name
                </p>
              </div>
            </div>
          </div>

          {/* Gallery Images */}
          <div className="mt-6">
            <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
              Product Gallery
              <span className="ml-2 font-normal text-[#6A7282]">(Optional - Additional product images)</span>
            </label>
            <div
              className={`relative rounded-lg border-2 border-dashed p-4 transition-colors ${
                isGalleryDragging
                  ? "border-black bg-gray-50"
                  : "border-[#E3E3E3] bg-white hover:border-gray-400"
              }`}
              onDrop={handleGalleryDrop}
              onDragOver={handleGalleryDragOver}
              onDragLeave={handleGalleryDragLeave}
            >
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                multiple
                onChange={(e) => handleGalleryImageAdd(e.target.files)}
                className="hidden"
              />

              {galleryImages.length === 0 ? (
                <div
                  className="flex cursor-pointer flex-col items-center justify-center py-6"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mb-3 text-[#9CA3AF]"
                  >
                    <path
                      d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="font-geist text-[14px] font-medium text-[#030712]">
                    Click or drag images to upload
                  </p>
                  <p className="mt-1 font-geist text-[12px] text-[#6A7282]">
                    JPG, PNG, WEBP, HEIC (Multiple files allowed)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {galleryImages.map((image) => (
                      <div
                        key={image.id}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-[#E3E3E3] bg-gray-50"
                      >
                        <img
                          src={image.preview}
                          alt="Gallery preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleGalleryImageRemove(image.id)}
                          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M9 3L3 9M3 3L9 9"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-[#E3E3E3] bg-white transition-colors hover:border-gray-400 hover:bg-gray-50"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#9CA3AF]">
                        <path
                          d="M12 5V19M5 12H19"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-center font-geist text-[12px] text-[#6A7282]">
                    {galleryImages.length} image{galleryImages.length !== 1 ? 's' : ''} added
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Information Section (Inventory & Pricing) */}
        <div className="mb-6 rounded-lg border border-[#E5E7EB] bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-geist text-[16px] font-medium leading-[150%] tracking-[-0.16px] text-[#020817]">
              Product Information
            </h2>
            <div className="flex items-center gap-3">
              <span className="font-geist text-[14px] font-semibold leading-[150%] tracking-[0.28px] text-[#0D0D12]">
                Add Variant
              </span>
              <button
                type="button"
                onClick={() => setHasVariants(!hasVariants)}
                className={`relative inline-flex h-8 w-14 cursor-pointer items-center rounded-full transition-colors ${
                  hasVariants ? "bg-[#2F2F2F]" : "bg-[#E5E7EB]"
                } hover:opacity-90`}
              >
                <span
                  className={`inline-block h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                    hasVariants ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Variant Management UI - Only show when hasVariants is true */}
          {hasVariants && (
            <div className="mb-6 space-y-4">
              {/* Variant Type Selection */}
              {variantTypes.map((vt, index) => (
                <VariantOptionsInput
                  key={index}
                  variantType={vt.type}
                  values={vt.values}
                  addPictures={vt.addPictures}
                  optionImages={optionImages[vt.type] || {}}
                  onChange={(values) => {
                    const updated = [...variantTypes];
                    updated[index] = { ...updated[index], values };
                    setVariantTypes(updated);
                  }}
                  onAddPicturesChange={(enabled) => {
                    const updated = [...variantTypes];
                    updated[index] = { ...updated[index], addPictures: enabled };
                    setVariantTypes(updated);
                  }}
                  onOptionImageChange={(optionValue, file) => handleOptionImageChange(vt.type, optionValue, file)}
                  onTypeChange={(newType) => {
                    const updated = [...variantTypes];
                    updated[index] = { ...updated[index], type: newType };
                    setVariantTypes(updated);
                  }}
                  onRemove={() => {
                    setVariantTypes(variantTypes.filter((_, i) => i !== index));
                  }}
                />
              ))}

              {/* Add Variant Button */}
              <button
                type="button"
                onClick={() => {
                  setVariantTypes([
                    ...variantTypes,
                    { type: "", values: [], addPictures: false },
                  ]);
                }}
                className="flex cursor-pointer items-center gap-2 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] transition-colors hover:text-black"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M10 4.167v11.666M4.167 10h11.666"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Add Variant
              </button>

              {/* Variant Table - Always show when variants are enabled */}
              <div className="mt-6 border-t border-[#E5E7EB] pt-6">
                <VariantTable
                  variants={variants}
                  variantTypes={variantTypes}
                  onChange={setVariants}
                  globalDiscountEnabled={globalDiscountEnabled}
                  onGlobalDiscountToggle={setGlobalDiscountEnabled}
                  globalDiscountType={globalDiscountType}
                  onGlobalDiscountTypeChange={setGlobalDiscountType}
                  globalDiscountValue={globalDiscountValue}
                  onGlobalDiscountValueChange={setGlobalDiscountValue}
                />
              </div>
            </div>
          )}

          {/* Show inventory and pricing fields only when variants are disabled */}
          {!hasVariants && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Available Quantity */}
            <div>
              <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                Available Quantity
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M16.6667 6.66667V4.16667C16.6667 3.24619 15.9205 2.5 15 2.5H4.16667C3.24619 2.5 2.5 3.24619 2.5 4.16667V15.8333C2.5 16.7538 3.24619 17.5 4.16667 17.5H7.5" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.83301 6.66667H13.333" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.83301 9.99967H7.49967" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.83301 13.3337H7.49967" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="10.208" y="10" width="8.33333" height="7.5" rx="2.25" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M13.125 10H15.625V12.0833C15.625 12.3135 15.4385 12.5 15.2083 12.5H13.5417C13.3115 12.5 13.125 12.3135 13.125 12.0833V10Z" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="e.g 1000"
                  {...register("availableQuantity")}
                  className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                />
              </div>
              {errors.availableQuantity && (
                <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                  {errors.availableQuantity.message}
                </p>
              )}
            </div>

            {/* Minimum stock alert */}
            <div>
              <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                Minimum stock alert
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="9.99967" cy="9.99967" r="5.41667" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.99967 10.208V12.083" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.99967 7.91703C9.96644 7.91703 9.93949 7.94398 9.93949 7.97721C9.93949 8.01045 9.96644 8.0374 9.99967 8.0374C10.0329 8.0374 10.0599 8.01045 10.0599 7.97721V7.97721C10.0599 7.96125 10.0535 7.94594 10.0422 7.93466C10.0309 7.92337 10.0156 7.91703 9.99967 7.91703V7.91703" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M4.05057 4.16699C0.872467 7.40657 0.872467 12.5941 4.05057 15.8337" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15.9502 4.16699C19.1283 7.40657 19.1283 12.5941 15.9502 15.8337" stroke="#030712" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="e.g 50"
                  {...register("minimumStockAlert")}
                  className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                />
              </div>
              {errors.minimumStockAlert && (
                <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                  {errors.minimumStockAlert.message}
                </p>
              )}
            </div>

            {/* Base price */}
            <div className="md:col-span-2">
              <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                Base price
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 18.3327C14.6024 18.3327 18.3334 14.6017 18.3334 9.99935C18.3334 5.39698 14.6024 1.66602 10 1.66602C5.39765 1.66602 1.66669 5.39698 1.66669 9.99935C1.66669 14.6017 5.39765 18.3327 10 18.3327Z" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 5.83268V14.166M6.66669 7.49935H11.6667C12.1087 7.49935 12.5326 7.67494 12.8452 7.98749C13.1577 8.30005 13.3333 8.72399 13.3333 9.16602C13.3333 9.60804 13.1577 10.032 12.8452 10.3445C12.5326 10.6571 12.1087 10.8327 11.6667 10.8327H8.33335C7.89133 10.8327 7.46739 11.0083 7.15483 11.3208C6.84228 11.6334 6.66669 12.0573 6.66669 12.4993C6.66669 12.9414 6.84228 13.3653 7.15483 13.6779C7.46739 13.9904 7.89133 14.166 8.33335 14.166H13.3333" stroke="#6A7282" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="e.g $150"
                  {...register("basePrice")}
                  className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 pl-12 pr-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                />
              </div>
              {errors.basePrice && (
                <p className="mt-1 font-public text-[12px] text-[#DC2626]">
                  {errors.basePrice.message}
                </p>
              )}
            </div>

            {/* Set Discount Toggle */}
            <div className="md:col-span-2 space-y-4">
              {/* Toggle Row */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={globalDiscountEnabled}
                    onChange={(e) => setGlobalDiscountEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#030712] peer-checked:after:translate-x-5"></div>
                </label>
                <span className="font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
                  Set Discount
                </span>
              </div>

              {/* Discount Type and Value Fields - shown when enabled */}
              {globalDiscountEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Discount Type */}
                  <div>
                    <label className="mb-2 block font-geist text-[14px] font-normal text-[#6A7282]">
                      Discount Type
                    </label>
                    <div className="relative">
                      <select
                        value={globalDiscountType}
                        onChange={(e) => setGlobalDiscountType(e.target.value as "percentage" | "fixed")}
                        className="w-full cursor-pointer appearance-none rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] outline-none transition-colors hover:border-[#999] focus:border-black"
                      >
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed</option>
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M4 6L8 10L12 6"
                            stroke="#6A7282"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Discount Value */}
                  <div>
                    <label className="mb-2 block font-geist text-[14px] font-normal text-[#6A7282]">
                      Discount Value
                    </label>
                    <input
                      type="number"
                      value={globalDiscountValue || ""}
                      onChange={(e) => setGlobalDiscountValue(Number(e.target.value) || 0)}
                      placeholder="e.g. 10"
                      min="0"
                      max={globalDiscountType === "percentage" ? 100 : undefined}
                      className="w-full rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] hover:border-[#999] focus:border-black"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

      </form>
    </div>
  );
}
