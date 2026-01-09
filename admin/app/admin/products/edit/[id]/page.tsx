"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/contexts/ToastContext";
import {
  ProductSchema,
  ProductFormData,
  ProductVariantFormData,
  WholesalePriceFormData,
  WholesaleTierFormData,
  generateVariantSku,
} from "@/lib/validators/product";
import { getProduct, updateProduct, updateOptionMetadata, UpdateProductRequest, getDefaultSalesChannel, getDefaultShippingProfile } from "@/lib/api/products";
import { uploadFile, uploadFiles } from "@/lib/api/uploads";
import { getCategories } from "@/lib/api/categories";
import { getBrands } from "@/lib/api/brands";
import { getStockLocations, updateVariantInventory, getVariantInventoryQuantity, getVariantInventoryDetails } from "@/lib/api/inventory";
import {
  VariantTable,
  VariantOptionsInput,
  SelectDropdown,
} from "@/components/admin/products";
import type { OptionImage, SelectOption } from "@/components/admin/products";

// Gallery image type for tracking file and preview
type GalleryImage = {
  id: string;
  file?: File; // Optional for existing images loaded from server
  preview: string;
  isExisting?: boolean; // True if loaded from server
};

export default function EditProductPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { showToast, confirm } = useToast();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
  // Option images: Map of "variantType:optionValue" -> OptionImage
  const [optionImages, setOptionImages] = useState<Record<string, Record<string, OptionImage>>>({});

  // Reserved inventory tracking (for non-variant products)
  const [reservedQuantity, setReservedQuantity] = useState<number>(0);

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

  const handleVariantsChange = (newVariants: ProductVariantFormData[]) => {
    setVariants(newVariants);
  };

  const handleDeleteVariant = (index: number) => {
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
  };

  // Handle option image upload
  const handleOptionImageChange = (variantType: string, optionValue: string, file: File | null) => {
    if (!file) return;

    // Create preview URL
    const preview = URL.createObjectURL(file);

    setOptionImages(prev => ({
      ...prev,
      [variantType]: {
        ...prev[variantType],
        [optionValue]: { file, preview }
      }
    }));
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
          isExisting: false,
        });
      }
    });
    setGalleryImages((prev) => [...prev, ...newImages]);
  };

  const handleGalleryImageRemove = (id: string): void => {
    setGalleryImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image && !image.isExisting) {
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

  const [globalDiscountEnabled, setGlobalDiscountEnabled] = useState<boolean>(false);
  const [globalDiscountType, setGlobalDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [globalDiscountValue, setGlobalDiscountValue] = useState<number>(0);

  // Fetch existing product
  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProduct(productId),
    enabled: !!productId,
  });

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

  // Populate form with existing product data
  // Wait for productData AND categoriesData to be loaded to avoid race condition
  useEffect(() => {
    if (productData && categoriesData && !isInitialized) {

      // Set basic fields
      setValue("productName", productData.title || "");
      setValue("handle", productData.handle || "");
      setValue("description", productData.description || "");
      setValue("status", productData.status || "draft");

      // Set category - categoriesData is now guaranteed to be loaded
      if (productData.categories && productData.categories.length > 0) {
        setValue("category", productData.categories[0].id);
      }

      // Set brand from metadata
      if (productData.metadata?.brand_id) {
        setValue("brand", productData.metadata.brand_id as string);
      }

      // Set thumbnail preview
      if (productData.thumbnail) {
        setImagePreview(productData.thumbnail);
      }

      // Load existing gallery images (exclude thumbnail from images array)
      if (productData.images && productData.images.length > 0) {
        const existingGalleryImages: GalleryImage[] = productData.images
          .filter((img: { url: string }) => img.url !== productData.thumbnail) // Exclude thumbnail
          .map((img: { id?: string; url: string }) => ({
            id: img.id || `existing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            preview: img.url,
            isExisting: true,
          }));
        setGalleryImages(existingGalleryImages);
      }

      // Set metadata fields
      if (productData.metadata) {
        setValue("minimumStockAlert", (productData.metadata.minimumStockAlert as string) || "");
        setRating((productData.metadata.rating as string) || "");
        setSoldCount((productData.metadata.sold_count as string) || "");
        // Badge and deals metadata
        setOnSale(Boolean(productData.metadata.on_sale));
        setFlashSale(Boolean(productData.metadata.flash_sale));
        setTrending(Boolean(productData.metadata.trending));
        setOnBrand(Boolean(productData.metadata.on_brand));
        setDealsRank((productData.metadata.deals_rank as string) || "");
        // Shipping metadata
        setShippingDays((productData.metadata.shipping_days as string) || "24-48");
        setFreeShipping(productData.metadata.free_shipping !== false);
        setShippingMethod((productData.metadata.shipping_method as string) || "Standard");
      }

      // Helper function to convert Medusa 2.x options array to Record<string, string>
      const convertOptionsToRecord = (options?: Array<{ value: string; option?: { title: string } }>): Record<string, string> => {
        if (!options || !Array.isArray(options)) return {};
        const record: Record<string, string> = {};
        options.forEach((opt) => {
          // Use the option title as key and value as value
          const key = opt.option?.title || "Option";
          record[key] = opt.value;
        });
        return record;
      };

      // Handle variants
      const productVariants = productData.variants || [];
      const hasMultipleVariants = productVariants.length > 1 ||
        (productVariants.length === 1 && productVariants[0].title !== "Default");

      if (hasMultipleVariants) {
        setHasVariants(true);

        // Extract variant types from variant options
        // Medusa 2.x returns options as array: [{value, option: {title}}]
        const optionTypesMap = new Map<string, Set<string>>();
        productVariants.forEach((v) => {
          if (v.options && Array.isArray(v.options)) {
            v.options.forEach((opt) => {
              const key = opt.option?.title || "Option";
              const value = opt.value;
              if (!optionTypesMap.has(key)) {
                optionTypesMap.set(key, new Set());
              }
              optionTypesMap.get(key)?.add(value);
            });
          }
        });

        // Check if product options have image metadata
        const productOptions = productData.options || [];
        const loadedOptionImages: Record<string, Record<string, OptionImage>> = {};

        const extractedVariantTypes = Array.from(optionTypesMap.entries()).map(([type, values]) => {
          // Find corresponding product option to check for images metadata
          const productOption = productOptions.find((opt) => opt.title === type);
          const hasImages = productOption?.metadata?.images &&
            typeof productOption.metadata.images === 'object';

          // Load existing images from metadata
          if (hasImages && productOption?.metadata) {
            const imagesMap = productOption.metadata.images as Record<string, string>;
            loadedOptionImages[type] = {};
            Object.entries(imagesMap).forEach(([optionValue, imageUrl]) => {
              loadedOptionImages[type][optionValue] = { preview: imageUrl };
            });
          }

          return {
            type,
            values: Array.from(values),
            addPictures: hasImages ? true : false,
          };
        });
        setVariantTypes(extractedVariantTypes);

        // Set loaded option images
        if (Object.keys(loadedOptionImages).length > 0) {
          setOptionImages(loadedOptionImages);
        }

        // Convert product variants to form variants
        const formVariants: ProductVariantFormData[] = productVariants.map((v) => {
          const metadata = (v as { metadata?: Record<string, unknown> }).metadata || {};
          // Generate SKU if null (for inventory lookup to work)
          const variantSku = v.sku || generateVariantSku(productData.handle || "", v.title);
          // Convert weight to number (API may return string)
          const weightNum = typeof v.weight === "string" ? parseFloat(v.weight) : v.weight;

          // Extract base prices (no min_quantity or min_quantity <= 1)
          const basePrices = v.prices?.filter((p) => !p.min_quantity || p.min_quantity <= 1)
            .map((p) => ({
              currency_code: p.currency_code,
              amount: p.amount,
            })) || [{ currency_code: "sgd", amount: 0 }];

          // Extract wholesale tiers (min_quantity > 1)
          const wholesaleTiers: WholesaleTierFormData[] = v.prices
            ?.filter((p) => p.min_quantity && p.min_quantity > 1)
            .map((p) => ({
              minQty: p.min_quantity as number,
              price: p.amount,
            }))
            .sort((a, b) => a.minQty - b.minQty) || [];

          return {
            title: v.title,
            sku: variantSku,
            prices: basePrices,
            options: convertOptionsToRecord(v.options),
            manage_inventory: v.manage_inventory ?? true,
            allow_backorder: v.allow_backorder ?? false,
            inventory_quantity: 0, // Will be fetched below
            min_stock_alert: (metadata.min_stock_alert as number) || 0,
            discount: (metadata.discount as number) || 0,
            weight: weightNum || 0,
            // Variant-level wholesale pricing
            wholesaleEnabled: wholesaleTiers.length > 0,
            wholesaleTiers: wholesaleTiers,
          };
        });
        setVariants(formVariants);

        // Load global discount settings from the first variant's metadata
        // This ensures discount persists when editing a product
        if (productVariants.length > 0) {
          const firstVariantMetadata = (productVariants[0] as { metadata?: Record<string, unknown> }).metadata || {};
          const savedDiscount = Number(firstVariantMetadata.discount) || 0;
          const savedDiscountType = (firstVariantMetadata.discount_type as "percentage" | "fixed") || "percentage";

          if (savedDiscount > 0) {
            setGlobalDiscountEnabled(true);
            setGlobalDiscountValue(savedDiscount);
            setGlobalDiscountType(savedDiscountType);
          }
        }

        // Fetch inventory quantities for each variant (async)
        // Use productVariants (raw API data) to get variant IDs
        const fetchInventoryQuantities = async () => {
          try {
            const updatedVariants = await Promise.all(
              formVariants.map(async (variant, index) => {
                // Get the variant ID from the raw API data
                const rawVariant = productVariants[index];
                const variantId = rawVariant?.id || "";
                const sku = variant.sku || undefined;
                const quantity = await getVariantInventoryQuantity(variantId, sku);
                return { ...variant, inventory_quantity: quantity };
              })
            );
            setVariants(updatedVariants);
          } catch (error) {
            console.error("Error fetching inventory quantities:", error);
          }
        };
        fetchInventoryQuantities();
      } else if (productVariants.length === 1) {
        // Single variant (default) - no variants UI
        const defaultVariant = productVariants[0];
        const price = defaultVariant.prices?.[0];
        if (price) {
          setValue("basePrice", (price.amount / 100).toString());
        }

        // Fetch inventory details for the single variant (including reserved quantity)
        const fetchSingleVariantInventory = async () => {
          try {
            const variantId = defaultVariant.id;
            const sku = defaultVariant.sku || generateVariantSku(productData.handle || "", defaultVariant.title);
            const details = await getVariantInventoryDetails(variantId, sku);
            // Show stocked quantity (not available) so admin can set the actual stock level
            setValue("availableQuantity", details.stocked.toString());
            setReservedQuantity(details.reserved);
          } catch (error) {
            console.error("Error fetching inventory details:", error);
          }
        };
        fetchSingleVariantInventory();
      }

      setIsInitialized(true);
    }
  }, [productData, categoriesData, isInitialized, setValue, productId]);

  // Auto-select inventory location when stock locations are loaded
  useEffect(() => {
    if (stockLocationsData && stockLocationsData.length > 0 && isInitialized) {
      // Check if metadata has a saved inventory location
      const savedLocation = productData?.metadata?.inventoryLocation as string | undefined;
      if (savedLocation && stockLocationsData.some(loc => loc.id === savedLocation)) {
        setValue("inventoryLocation", savedLocation);
      } else if (stockLocationsData.length === 1) {
        // Auto-select if there's only one location
        setValue("inventoryLocation", stockLocationsData[0].id);
      }
    }
  }, [stockLocationsData, isInitialized, productData, setValue]);

  // Generate all variant combinations from options (used when adding new variants)
  const generateVariants = (): void => {
    if (variantTypes.length === 0) {
      setVariants([]);
      return;
    }

    // Filter out empty variant types
    const validTypes = variantTypes.filter(vt => vt.type && vt.values.length > 0);
    if (validTypes.length === 0) {
      return;
    }

    // Generate cartesian product of all option values
    const combinations: Array<Record<string, string>> = [];
    const generateCombinations = (
      index: number,
      current: Record<string, string>
    ): void => {
      if (index === validTypes.length) {
        combinations.push({ ...current });
        return;
      }

      const { type, values } = validTypes[index];
      for (const value of values) {
        current[type] = value;
        generateCombinations(index + 1, current);
      }
    };

    generateCombinations(0, {});

    // Create variant objects, preserving existing variant data when possible
    const productHandle = form.getValues("handle") || productData?.handle || "";
    const newVariants: ProductVariantFormData[] = combinations.map((combo) => {
      const title = Object.values(combo).join(" / ");
      // Check if this variant already exists (match by title or by options)
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

  // Handle variant type changes (triggers regeneration)
  const handleVariantTypeChange = (
    index: number,
    field: "type" | "values" | "addPictures",
    value: string | string[] | boolean
  ): void => {
    const updated = [...variantTypes];
    if (field === "type") {
      updated[index] = { ...updated[index], type: value as string };
    } else if (field === "values") {
      updated[index] = { ...updated[index], values: value as string[] };
    } else if (field === "addPictures") {
      updated[index] = { ...updated[index], addPictures: value as boolean };
    }
    setVariantTypes(updated);
  };

  // Add new variant type
  const handleAddVariantType = (): void => {
    setVariantTypes([...variantTypes, { type: "", values: [], addPictures: false }]);
  };

  // Remove variant type
  const handleRemoveVariantType = (index: number): void => {
    const updated = variantTypes.filter((_, i) => i !== index);
    setVariantTypes(updated);
  };

  // Regenerate variants when variant types change (only after initial load)
  useEffect(() => {
    if (!isInitialized || !hasVariants) {
      return;
    }
    // Only regenerate if there are valid variant types
    const validTypes = variantTypes.filter(vt => vt.type && vt.values.length > 0);
    if (validTypes.length > 0) {
      generateVariants();
    }
  }, [variantTypes, hasVariants, isInitialized]);

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      // Step 1: Upload new product image if changed
      let thumbnailUrl: string | undefined = productData?.thumbnail;
      if (data.productImage) {
        thumbnailUrl = await uploadFile(data.productImage);
      }

      // Step 1b: Handle gallery images (upload new ones, keep existing ones)
      const existingGalleryUrls = galleryImages
        .filter((img) => img.isExisting)
        .map((img) => img.preview);
      const newGalleryFiles = galleryImages
        .filter((img) => !img.isExisting && img.file)
        .map((img) => img.file!);
      let newGalleryUrls: string[] = [];
      if (newGalleryFiles.length > 0) {
        newGalleryUrls = await uploadFiles(newGalleryFiles);
      }
      const allGalleryUrls = [...existingGalleryUrls, ...newGalleryUrls];

      // Use variants from form data (synced from state) to avoid stale closure
      const formVariants = data.variants || [];

      // Step 2: Upload variant images
      const variantsWithImages = formVariants.filter((v) => v.image);
      const variantImageUrls: string[] = [];
      if (variantsWithImages.length > 0) {
        const imageFiles = variantsWithImages.map((v) => v.image!);
        const urls = await uploadFiles(imageFiles);
        variantImageUrls.push(...urls);
      }

      // Step 3: Helper function to calculate max quantity for wholesale tiers
      const calculateMaxQty = (tiers: WholesaleTierFormData[], index: number): number | undefined => {
        if (index === tiers.length - 1) {
          return undefined; // Last tier has no max (unlimited)
        }
        const nextTier = tiers[index + 1];
        if (nextTier && nextTier.minQty > tiers[index].minQty) {
          return nextTier.minQty - 1;
        }
        return undefined;
      };

      // Step 4: Prepare variants with uploaded image URLs and variant-level wholesale pricing
      const preparedVariants = formVariants.map((variant) => {
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

        // Generate SKU if not set (ensures inventory lookup works)
        const variantSku = variant.sku || generateVariantSku(data.handle || "", variant.title);
        return {
          title: variant.title,
          sku: variantSku,
          prices: allPrices,
          options: variant.options as Record<string, string> | undefined,
          manage_inventory: variant.manage_inventory,
          allow_backorder: variant.allow_backorder,
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
            } else if (imageData.preview && !imageData.preview.startsWith('blob:')) {
              // Keep existing URL (already uploaded)
              optionImageUrlsMap[variantType.type][optionValue] = imageData.preview;
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

      // Step 6: Update product with variants
      const productPayload: Record<string, unknown> = {
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
          allGalleryUrls.forEach((url) => {
            imageList.push({ url });
          });
          return imageList.length > 0 ? imageList : undefined;
        })(),
        categories: data.category ? [{ id: data.category }] : undefined,
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
        // Ensure product is linked to sales channel (required for storefront visibility)
        sales_channels: defaultSalesChannel ? [{ id: defaultSalesChannel.id }] : undefined,
        // Ensure product is linked to shipping profile (required for checkout to work)
        shipping_profile_id: defaultShippingProfile?.id,
      };

      // Include variants if product has variants
      if (hasVariants && preparedVariants.length > 0) {
        // Match existing variant IDs with prepared variants by title
        const existingVariants = productData?.variants || [];
        const variantsWithIds = preparedVariants.map((pv) => {
          const existing = existingVariants.find((ev) => ev.title === pv.title);
          return {
            ...pv,
            id: existing?.id, // Include ID for existing variants
          };
        });
        productPayload.variants = variantsWithIds;
        productPayload.options = options;
      } else if (!hasVariants && productData?.variants?.length === 1) {
        // Update single variant (default variant) for non-variant products
        // Note: Wholesale tier pricing requires variants - non-variant products only have base price
        const defaultVariant = productData.variants[0];
        const basePrice = parseFloat(data.basePrice || "0") * 100; // Convert to cents

        // Build prices array with base price only (no wholesale for non-variant products)
        const prices: Array<{ currency_code: string; amount: number }> = [
          { currency_code: "sgd", amount: Math.round(basePrice) },
        ];

        productPayload.variants = [
          {
            id: defaultVariant.id,
            title: defaultVariant.title,
            sku: defaultVariant.sku || data.handle,
            prices,
            manage_inventory: true,
            metadata: {
              min_stock_alert: parseInt(data.minimumStockAlert || "0"),
              discount: globalDiscountEnabled ? globalDiscountValue : 0,
              discount_type: globalDiscountEnabled ? globalDiscountType : "percentage",
            },
          },
        ];
      }

      let product = await updateProduct(productId, productPayload as UpdateProductRequest);

      // Step 7: Save option images to metadata using separate API endpoint
      // (Medusa doesn't support setting option metadata through product update)
      if (hasVariants && Object.keys(optionImageUrlsMap).length > 0) {
        // Re-fetch the product to get options with IDs (updateProduct may not return them)
        const updatedProduct = await getProduct(productId);
        if (updatedProduct.options && updatedProduct.options.length > 0) {
          for (const option of updatedProduct.options) {
            const imagesForOption = optionImageUrlsMap[option.title];
            if (imagesForOption && Object.keys(imagesForOption).length > 0) {
              try {
                await updateOptionMetadata(productId, option.id, {
                  images: imagesForOption,
                });
              } catch (error) {
                console.error(`Failed to update option metadata for ${option.title}:`, error);
                // Continue with other options even if one fails
              }
            }
          }
          // Use the refetched product for subsequent operations
          product = updatedProduct;
        }
      }

      // Step 8: Update inventory for each variant
      const inventoryResults: { success: string[]; failed: Array<{ title: string; error: string }> } = {
        success: [],
        failed: [],
      };

      const selectedLocationId = data.inventoryLocation;
      if (selectedLocationId && product.variants) {
        const inventoryPromises = product.variants.map((variant, index) => {
          const quantity = hasVariants
            ? formVariants[index]?.inventory_quantity ?? 0
            : parseInt(data.availableQuantity || "0");

          // Always update inventory (even if 0) to sync with user input
          return updateVariantInventory(
            { id: variant.id, sku: variant.sku || undefined, title: variant.title },
            quantity,
            selectedLocationId,
            productId // Pass productId for inventory linking
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
        });

        await Promise.all(inventoryPromises);
      }

      return { product, inventoryResults };
    },
    onSuccess: ({ inventoryResults }) => {
      if (inventoryResults.failed.length > 0) {
        showToast(
          `Product updated! But inventory update failed for: ${inventoryResults.failed
            .map((f) => f.title)
            .join(", ")}`,
          "warning"
        );
      } else {
        showToast("Product updated successfully!", "success");
      }
      router.push("/admin/products");
    },
    onError: (error) => {
      console.error("Failed to update product:", error);
      showToast("Failed to update product. Please try again.", "error");
    },
  });

  const onSubmit = (data: ProductFormData): void => {
    updateProductMutation.mutate(data);
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

  // Sync hasVariants state to form for validation
  useEffect(() => {
    setValue("hasVariants", hasVariants);
  }, [hasVariants, setValue]);

  // Sync variants and options to form when they change
  useEffect(() => {
    if (hasVariants) {
      const formOptions = variantTypes
        .filter((vt) => vt.type && vt.values.length > 0)
        .map((vt) => ({
          title: vt.type,
          values: vt.values,
        }));
      setValue("options", formOptions);
      setValue("variants", variants);
    } else {
      setValue("options", []);
      setValue("variants", []);
    }
  }, [hasVariants, variantTypes, variants, setValue]);

  if (productLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="font-geist text-[16px] text-[#6A7282]">Loading product...</div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="font-geist text-[16px] text-[#DC2626]">Product not found</div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
            Products
          </h1>
          <p className="mt-1 font-geist text-[14px] text-[#6A7282]">
            Edit: {productData?.title || "Loading..."}
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
            form="edit-product-form"
            disabled={updateProductMutation.isPending}
            className="cursor-pointer rounded-[9px] border-t border-[rgba(255,255,255,0.30)] bg-[#2F2F2F] px-4 py-2 text-center font-geist text-[14px] font-medium tracking-[-0.14px] text-white transition-colors hover:bg-[#3D3D3D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updateProductMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-6 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] p-4">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" className="mt-0.5 shrink-0">
              <path d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <h3 className="font-geist text-[14px] font-medium text-[#DC2626]">
                Please fix the following errors:
              </h3>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {Object.entries(errors).map(([key, error]) => (
                  <li key={key} className="font-geist text-[13px] text-[#B91C1C]">
                    {key}: {(error as { message?: string })?.message || "Invalid value"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form id="edit-product-form" onSubmit={handleSubmit(onSubmit)}>
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
                        <g clipPath="url(#clip0_edit)">
                          <path d="M9.37402 10.6748C9.59423 10.6748 9.80667 10.7514 9.97559 10.8896L10.0459 10.9531L10.1084 11.0225C10.247 11.1915 10.3232 11.4045 10.3232 11.625V11.9492C10.3234 12.9052 11.1075 13.6918 12.0312 13.6748L12.1943 13.6641C12.5725 13.6197 12.9264 13.447 13.1953 13.1729C13.5024 12.8596 13.6748 12.4386 13.6748 12V11.625C13.6748 11.3732 13.7742 11.1312 13.9521 10.9531C14.1302 10.775 14.3722 10.6748 14.624 10.6748L20.999 10.6748C21.5491 10.6748 22.0768 10.8934 22.4658 11.2822C22.8549 11.6713 23.0732 12.1998 23.0732 12.75V18.75C23.0731 19.3001 22.8548 19.8278 22.4658 20.2168C22.0768 20.6057 21.5491 20.8242 20.999 20.8242H2.99902C2.4489 20.8242 1.92127 20.6057 1.53223 20.2168C1.14326 19.8278 0.924907 19.3001 0.924805 18.75L0.924805 12.75C0.924805 12.1998 1.14317 11.6713 1.53223 11.2822C1.92126 10.8934 2.44895 10.6748 2.99902 10.6748H9.37402ZM17.5166 15.21C17.4099 15.2312 17.3113 15.2834 17.2344 15.3604C17.1575 15.4373 17.1052 15.5359 17.084 15.6426C17.0629 15.7491 17.0737 15.8596 17.1152 15.96C17.1569 16.0605 17.2279 16.1466 17.3184 16.207C17.4089 16.2675 17.5152 16.2998 17.624 16.2998C17.77 16.2998 17.9104 16.2419 18.0137 16.1387C18.1166 16.0356 18.1747 15.8957 18.1748 15.75C18.1748 15.6411 18.1425 15.5339 18.082 15.4434C18.0216 15.353 17.9354 15.2829 17.835 15.2412C17.7344 15.1996 17.6234 15.1887 17.5166 15.21ZM11.999 0.924805C12.173 0.924805 12.3452 0.958827 12.5059 1.02539C12.6666 1.09204 12.8135 1.18936 12.9365 1.3125L12.9355 1.31348L17.4355 5.8125C17.684 6.06098 17.8242 6.39859 17.8242 6.75C17.8241 7.05712 17.7173 7.35327 17.5244 7.58887L17.4355 7.68652C17.1871 7.93489 16.8503 8.07422 16.499 8.07422C16.1477 8.07422 15.811 7.93489 15.5625 7.68652L13.3232 5.44629V12C13.3231 12.3512 13.1839 12.6882 12.9355 12.9365C12.6872 13.1848 12.3502 13.3242 11.999 13.3242C11.6478 13.3242 11.3109 13.1848 11.0625 12.9365C10.8142 12.6882 10.6749 12.3512 10.6748 12V5.44629L8.43555 7.68555L8.43652 7.68652C8.3135 7.80968 8.16666 7.90698 8.00586 7.97363C7.84514 8.04021 7.67299 8.0752 7.49902 8.0752C7.32505 8.0752 7.15291 8.04022 6.99219 7.97363C6.83139 7.90698 6.68454 7.80968 6.56152 7.68652V7.68555C6.43884 7.56274 6.34089 7.41719 6.27441 7.25684C6.20785 7.0962 6.17388 6.92388 6.17383 6.75C6.17383 6.57593 6.20776 6.40299 6.27441 6.24219C6.34107 6.0814 6.43935 5.93551 6.5625 5.8125L11.0615 1.31348V1.3125C11.1845 1.18936 11.3314 1.09204 11.4922 1.02539C11.6529 0.958827 11.8251 0.924805 11.999 0.924805Z" fill="#030712" stroke="white" strokeWidth="1.14914"/>
                        </g>
                        <defs>
                          <clipPath id="clip0_edit">
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
            </div>

            {/* Right side form fields */}
            <div className="grid grid-cols-1 gap-6 lg:col-span-2 lg:grid-cols-2">
              {/* Product Name */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="Enter product name"
                  {...register("productName")}
                  className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 px-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                />
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
                <input
                  type="text"
                  placeholder="Auto-generated from product name"
                  {...register("handle")}
                  className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 px-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Category
                </label>
                <SelectDropdown
                  value={watch("category") || ""}
                  onChange={(value) => setValue("category", value)}
                  options={
                    categoriesData?.product_categories.map((category) => ({
                      id: category.id,
                      label: category.name,
                    })) || []
                  }
                  placeholder={categoriesLoading ? "Loading categories..." : "Select a category"}
                  disabled={categoriesLoading}
                />
              </div>

              {/* Brand */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Brand
                </label>
                <SelectDropdown
                  value={watch("brand") || ""}
                  onChange={(value) => setValue("brand", value)}
                  options={
                    brandsData?.brands.map((brand) => ({
                      id: brand.id,
                      label: brand.name,
                    })) || []
                  }
                  placeholder={brandsLoading ? "Loading brands..." : "Select a brand (optional)"}
                  disabled={brandsLoading}
                />
              </div>

              {/* Inventory Location */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Inventory Location
                </label>
                <SelectDropdown
                  value={watch("inventoryLocation") || ""}
                  onChange={(value) => setValue("inventoryLocation", value)}
                  options={
                    stockLocationsData?.map((location) => ({
                      id: location.id,
                      label: location.name,
                    })) || []
                  }
                  placeholder={stockLocationsLoading ? "Loading locations..." : "Select inventory location"}
                  disabled={stockLocationsLoading}
                />
              </div>

              {/* Status */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Status
                </label>
                <SelectDropdown
                  value={watch("status") || "draft"}
                  onChange={(value) => setValue("status", value as "draft" | "published")}
                  options={[
                    { id: "draft", label: "Draft" },
                    { id: "published", label: "Published" },
                  ]}
                  placeholder="Select status"
                />
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
                    <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#030712] peer-checked:after:translate-x-5"></div>
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
                    <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#C52129] peer-checked:after:translate-x-5"></div>
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
                    <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#F59E0B] peer-checked:after:translate-x-5"></div>
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
                    <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#23429B] peer-checked:after:translate-x-5"></div>
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
                  Estimated hours for delivery (e.g., 24-48)
                </p>
              </div>

              {/* Free Shipping Toggle */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Free Shipping
                </label>
                <div className="flex items-center gap-3 mt-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={freeShipping}
                      onChange={(e) => setFreeShipping(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#030712] peer-checked:after:translate-x-5"></div>
                  </label>
                  <span className="font-geist text-[14px] text-[#6A7282]">
                    This product has free shipping
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
              Pricing & Inventory
            </h2>

            {/* Toggle to add/remove variants */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={async (e) => {
                    if (e.target.checked) {
                      setHasVariants(true);
                      if (variantTypes.length === 0) {
                        // Initialize with one empty variant type when enabling
                        setVariantTypes([{ type: "", values: [], addPictures: false }]);
                      }
                    } else {
                      // Warn before disabling variants if there are existing variants
                      if (variants.length > 0) {
                        const confirmed = await confirm(
                          "Disabling variants will remove all variant data. Are you sure?"
                        );
                        if (!confirmed) return;
                      }
                      setHasVariants(false);
                      setVariantTypes([]);
                      setVariants([]);
                    }
                  }}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#030712] peer-checked:after:translate-x-5"></div>
              </label>
              <span className="font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
                {hasVariants ? "Has Variants" : "Add Variants"}
              </span>
            </div>
          </div>

          {/* Show inventory and pricing fields only when variants are disabled */}
          {!hasVariants && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Stock Quantity */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Stock Quantity
                </label>
                <input
                  type="text"
                  placeholder="e.g 1000"
                  {...register("availableQuantity")}
                  className={`w-full rounded-lg border bg-white py-3 px-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black ${
                    reservedQuantity > 0 && parseInt(form.watch("availableQuantity") || "0") < reservedQuantity
                      ? "border-[#F59E0B]"
                      : "border-[#E3E3E3]"
                  }`}
                />
                {/* Reserved quantity info */}
                {reservedQuantity > 0 && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-[#FEF3C7] px-3 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                      <path d="M8 5.33333V8M8 10.6667H8.00667M14.6667 8C14.6667 11.6819 11.6819 14.6667 8 14.6667C4.3181 14.6667 1.33333 11.6819 1.33333 8C1.33333 4.3181 4.3181 1.33333 8 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <p className="font-geist text-[13px] font-medium text-[#92400E]">
                        {reservedQuantity} units reserved by pending orders
                      </p>
                      <p className="font-geist text-[12px] text-[#B45309]">
                        Available to sell: {Math.max(0, parseInt(form.watch("availableQuantity") || "0") - reservedQuantity)} units
                      </p>
                      {parseInt(form.watch("availableQuantity") || "0") < reservedQuantity && (
                        <p className="mt-1 font-geist text-[12px] font-medium text-[#DC2626]">
                          Warning: Stock is below reserved quantity. This will result in negative available inventory.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Base price */}
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium leading-[150%] tracking-[-0.14px] text-[#020817]">
                  Base price
                </label>
                <input
                  type="text"
                  placeholder="e.g $150"
                  {...register("basePrice")}
                  className="w-full rounded-lg border border-[#E3E3E3] bg-white py-3 px-4 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
                />
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
                    <div className="h-6 w-11 rounded-full bg-[#E5E7EB] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[#030712] peer-checked:after:translate-x-5"></div>
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
                      <SelectDropdown
                        value={globalDiscountType}
                        onChange={(value) => setGlobalDiscountType(value as "percentage" | "fixed")}
                        options={[
                          { id: "percentage", label: "Percentage" },
                          { id: "fixed", label: "Fixed" },
                        ]}
                        placeholder="Select type"
                      />
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

          {/* Variant Options Editor - for adding/modifying variant types */}
          {hasVariants && (
            <div className="mb-6">
              <h3 className="mb-4 font-geist text-[14px] font-medium text-[#030712]">
                Variant Options
              </h3>

              {/* Existing variant type editors */}
              {variantTypes.map((variantType, index) => (
                <VariantOptionsInput
                  key={index}
                  variantType={variantType.type}
                  values={variantType.values}
                  addPictures={variantType.addPictures}
                  optionImages={optionImages[variantType.type] || {}}
                  onChange={(values) => handleVariantTypeChange(index, "values", values)}
                  onAddPicturesChange={(enabled) => handleVariantTypeChange(index, "addPictures", enabled)}
                  onOptionImageChange={(optionValue, file) => handleOptionImageChange(variantType.type, optionValue, file)}
                  onRemove={() => handleRemoveVariantType(index)}
                  onTypeChange={(newType) => handleVariantTypeChange(index, "type", newType)}
                />
              ))}

              {/* Add Variant Type Button */}
              <button
                type="button"
                onClick={handleAddVariantType}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 font-geist text-[14px] font-medium tracking-[-0.14px] text-[#6A7282] transition-colors hover:border-[#030712] hover:text-[#030712]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M8 3.33333V12.6667M3.33333 8H12.6667"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Add Variant Type
              </button>
            </div>
          )}

          {/* Variant Table for products with variants */}
          {hasVariants && variants.length > 0 && (
            <VariantTable
              variants={variants}
              variantTypes={variantTypes}
              onChange={handleVariantsChange}
              globalDiscountEnabled={globalDiscountEnabled}
              onGlobalDiscountToggle={setGlobalDiscountEnabled}
              globalDiscountType={globalDiscountType}
              onGlobalDiscountTypeChange={setGlobalDiscountType}
              globalDiscountValue={globalDiscountValue}
              onGlobalDiscountValueChange={setGlobalDiscountValue}
              showDeleteButton={true}
              onDeleteVariant={handleDeleteVariant}
            />
          )}
        </div>

      </form>
    </div>
  );
}
