import {
  CreateInventoryLevelInput,
  ExecArgs,
  IUserModuleService,
  IAuthModuleService,
} from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);
  const regionModuleService = container.resolve(Modules.REGION);
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION);
  const productModuleService = container.resolve(Modules.PRODUCT);
  const taxModuleService = container.resolve(Modules.TAX);

  const countries = ["sg"]; // Singapore only

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          {
            currency_code: "sgd",
            is_default: true,
          },
        ],
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });
  logger.info("Seeding region data...");
  let regions = await regionModuleService.listRegions({
    name: "Singapore",
  });

  if (!regions.length) {
    const { result: regionResult } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Singapore",
            currency_code: "sgd",
            countries,
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    regions = regionResult;
  }
  const region = regions[0];

  // Stripe payment provider linking disabled - using system default only
  // const paymentModuleService = container.resolve(Modules.PAYMENT);
  // const regionPaymentProviders = await paymentModuleService.listPaymentProviders({
  //   id: ["pp_stripe_stripe"],
  // });

  // if (regionPaymentProviders.length) {
  //   try {\n  //     await link.create({
  //       [Modules.REGION]: {
  //         region_id: region.id,
  //       },
  //       [Modules.PAYMENT]: {
  //         payment_provider_id: "pp_stripe_stripe",
  //       },
  //     });
  //     logger.info("Linked Stripe payment provider to Singapore region.");
  //   } catch (e) {
  //     // Link might already exist
  //     logger.info("Stripe payment provider already linked to region.");
  //   }
  // } else {
  //   logger.warn("Stripe payment provider not found. Payment may not work correctly.");
  // }
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  const existingTaxRegions = await taxModuleService.listTaxRegions();

  if (!existingTaxRegions.length) {
    await createTaxRegionsWorkflow(container).run({
      input: countries.map((country_code) => ({
        country_code,
        provider_id: "tp_system"
      })),
    });
  }
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  let stockLocations = await stockLocationModuleService.listStockLocations({
    name: "Singapore Warehouse",
  });

  if (!stockLocations.length) {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container
    ).run({
      input: {
        locations: [
          {
            name: "Singapore Warehouse",
            address: {
              city: "Singapore",
              country_code: "SG",
              address_1: "",
            },
          },
        ],
      },
    });
    stockLocations = stockLocationResult;
  }
  const stockLocation = stockLocations[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default"
  })
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
    await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default Shipping Profile",
            type: "default",
          },
        ],
      },
    });
    shippingProfile = shippingProfileResult[0];
  }

  let fulfillmentSets = await fulfillmentModuleService.listFulfillmentSets(
    { name: "Singapore Warehouse delivery" },
    { relations: ["service_zones", "service_zones.geo_zones"] }
  );
  let fulfillmentSet = fulfillmentSets.length ? fulfillmentSets[0] : null;

  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Singapore Warehouse delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Singapore",
          geo_zones: [
            {
              country_code: "sg",
              type: "country",
            },
          ],
        },
      ],
    });
  }

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    });
  } catch (e) {
    // Link might already exist
    logger.info("Stock location to fulfillment set link already exists.");
  }

  // Get service zone ID
  const serviceZoneId = fulfillmentSet.service_zones?.[0]?.id;
  if (!serviceZoneId) {
    logger.error("No service zone found for fulfillment set. Skipping shipping options.");
  } else {
    // Check if shipping options exist for this service zone
    const existingShippingOptions = await fulfillmentModuleService.listShippingOptions({
      service_zone: { id: serviceZoneId },
    });

    if (!existingShippingOptions.length) {
      await createShippingOptionsWorkflow(container).run({
        input: [
          {
            name: "Standard Shipping",
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: serviceZoneId,
            shipping_profile_id: shippingProfile.id,
            type: {
              label: "Standard",
              description: "Ship in 2-3 days.",
              code: "standard",
            },
            prices: [
              {
                currency_code: "sgd",
                amount: 10,
              },
              {
                region_id: region.id,
                amount: 10,
              },
            ],
            rules: [
              {
                attribute: "enabled_in_store",
                value: "true",
                operator: "eq",
              },
              {
                attribute: "is_return",
                value: "false",
                operator: "eq",
              },
            ],
          },
          {
            name: "Express Shipping",
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: serviceZoneId,
            shipping_profile_id: shippingProfile.id,
            type: {
              label: "Express",
              description: "Ship in 24 hours.",
              code: "express",
            },
            prices: [
              {
                currency_code: "sgd",
                amount: 10,
              },
              {
                region_id: region.id,
                amount: 10,
              },
            ],
            rules: [
              {
                attribute: "enabled_in_store",
                value: "true",
                operator: "eq",
              },
              {
                attribute: "is_return",
                value: "false",
                operator: "eq",
              },
            ],
          },
        ],
      });
    } else {
      logger.info("Shipping options already exist. Skipping.");
    }
  }
  logger.info("Finished seeding fulfillment data.");

  try {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel[0].id],
      },
    });
  } catch (e) {
    // Link might already exist
    logger.info("Sales channel to stock location link already exists.");
  }
  logger.info("Finished seeding stock location data.");

  logger.info("Checking publishable API key...");
  const apiKeyModule = container.resolve(Modules.API_KEY);
  const existingApiKeys = await apiKeyModule.listApiKeys({ type: "publishable" });

  if (existingApiKeys.length) {
    logger.info(`Found existing publishable API key: ${existingApiKeys[0].token}`);
    // Ensure sales channel is linked to existing API key
    try {
      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: {
          id: existingApiKeys[0].id,
          add: [defaultSalesChannel[0].id],
        },
      });
      logger.info("Linked sales channel to existing API key.");
    } catch (e) {
      // Link might already exist, that's fine
      logger.info("Sales channel already linked to API key.");
    }
  } else {
    // Only create new API key if none exists
    const { result: publishableApiKeyResult } = await createApiKeysWorkflow(
      container
    ).run({
      input: {
        api_keys: [
          {
            title: "Webshop",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });
    const publishableApiKey = publishableApiKeyResult[0];

    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableApiKey.id,
        add: [defaultSalesChannel[0].id],
      },
    });
    logger.info(`Created new publishable API key: ${publishableApiKey.token}`);
  }
  logger.info("Finished publishable API key setup.");

  logger.info("Seeding product data...");

  let categories = await productModuleService.listProductCategories();

  if (!categories.length) {
    const { result: categoryResult } = await createProductCategoriesWorkflow(
      container
    ).run({
      input: {
        product_categories: [
          {
            name: "Creams",
            is_active: true,
          },
          {
            name: "Serums",
            is_active: true,
          },
          {
            name: "Lotions",
            is_active: true,
          },
          {
            name: "Cleansers",
            is_active: true,
          },
          {
            name: "Sun Protection",
            is_active: true,
          },
          {
            name: "Lip Care",
            is_active: true,
          },
        ],
      },
    });
    categories = categoryResult;
  }

  const categoryResult = categories;

  const existingProducts = await productModuleService.listProducts();

  if (existingProducts.length) {
    logger.info("Products already exist. Skipping product seeding.");
  } else {

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Pure Hydrating Face Toner",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Cleansers")!.id,
          ],
          description:
            "A refreshing, alcohol-free toner that balances and hydrates your skin with natural botanical extracts. Perfect for all skin types.",
          handle: "face-toner",
          weight: 200,
          status: ProductStatus.PUBLISHED,
          metadata: {
            bestseller: true,
            featured: false,
          },
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/face-toner.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["100ml", "200ml"],
            },
          ],
          variants: [
            {
              title: "100ml",
              sku: "FACE-TONER-100ML",
              options: {
                Size: "100ml",
              },
              prices: [
                {
                  amount: 4799,
                  currency_code: "sgd",
                },
              ],
            },
            {
              title: "200ml",
              sku: "FACE-TONER-200ML",
              options: {
                Size: "200ml",
              },
              prices: [
                {
                  amount: 7999,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Gentle Foaming Body Wash",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Cleansers")!.id,
          ],
          description:
            "Luxurious foaming body wash enriched with natural oils and vitamins. Gently cleanses while nourishing your skin.",
          handle: "body-wash",
          weight: 300,
          status: ProductStatus.PUBLISHED,
          metadata: {
            bestseller: true,
            featured: false,
          },
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/body-wash.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["250ml", "500ml"],
            },
          ],
          variants: [
            {
              title: "250ml",
              sku: "BODY-WASH-250ML",
              options: {
                Size: "250ml",
              },
              prices: [
                {
                  amount: 4999,
                  currency_code: "sgd",
                },
              ],
            },
            {
              title: "500ml",
              sku: "BODY-WASH-500ML",
              options: {
                Size: "500ml",
              },
              prices: [
                {
                  amount: 8499,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Brightening Body Serum",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Serums")!.id,
          ],
          description:
            "Advanced brightening serum with vitamin C and niacinamide. Reduces dark spots and evens skin tone for radiant, glowing skin.",
          handle: "body-serum",
          weight: 100,
          status: ProductStatus.PUBLISHED,
          metadata: {
            bestseller: true,
            featured: false,
          },
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/body-serum.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["50ml", "100ml"],
            },
          ],
          variants: [
            {
              title: "50ml",
              sku: "BODY-SERUM-50ML",
              options: {
                Size: "50ml",
              },
              prices: [
                {
                  amount: 4999,
                  currency_code: "sgd",
                },
              ],
            },
            {
              title: "100ml",
              sku: "BODY-SERUM-100ML",
              options: {
                Size: "100ml",
              },
              prices: [
                {
                  amount: 8999,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Purifying Clay Face Mask",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Cleansers")!.id,
          ],
          description:
            "Deep-cleansing clay mask that draws out impurities, minimizes pores, and leaves skin feeling refreshed and revitalized.",
          handle: "face-mask",
          weight: 150,
          status: ProductStatus.PUBLISHED,
          metadata: {
            bestseller: true,
            featured: false,
          },
          options: [
            {
              title: "Size",
              values: ["100ml"],
            },
          ],
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/face-mask.png",
            },
          ],
          variants: [
            {
              title: "100ml",
              sku: "FACE-MASK-100ML",
              options: {
                Size: "100ml",
              },
              prices: [
                {
                  amount: 4999,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Gentle Daily Face Cleanser",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Cleansers")!.id,
          ],
          description:
            "Mild, pH-balanced cleanser that effectively removes makeup and impurities without stripping skin of essential moisture.",
          handle: "face-cleanser",
          weight: 180,
          status: ProductStatus.PUBLISHED,
          metadata: {
            featured: true,
            bestseller: false,
          },
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/face-cleanser.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["150ml", "300ml"],
            },
          ],
          variants: [
            {
              title: "150ml",
              sku: "FACE-CLEANSER-150ML",
              options: {
                Size: "150ml",
              },
              prices: [
                {
                  amount: 3999,
                  currency_code: "sgd",
                },
              ],
            },
            {
              title: "300ml",
              sku: "FACE-CLEANSER-300ML",
              options: {
                Size: "300ml",
              },
              prices: [
                {
                  amount: 6999,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Intensive Night Cream",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Creams")!.id,
          ],
          description:
            "Rich, nourishing night cream with retinol and peptides. Repairs and rejuvenates skin overnight for a youthful, radiant complexion.",
          handle: "night-cream",
          weight: 100,
          status: ProductStatus.PUBLISHED,
          metadata: {
            featured: true,
            bestseller: false,
          },
          options: [
            {
              title: "Size",
              values: ["50ml"],
            },
          ],
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/night-cream.png",
            },
          ],
          variants: [
            {
              title: "50ml",
              sku: "NIGHT-CREAM-50ML",
              options: {
                Size: "50ml",
              },
              prices: [
                {
                  amount: 5999,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Revitalizing Eye Cream",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Creams")!.id,
          ],
          description:
            "Lightweight eye cream that reduces dark circles, puffiness, and fine lines. Caffeine and hyaluronic acid provide instant refreshment.",
          handle: "eye-cream",
          weight: 50,
          status: ProductStatus.PUBLISHED,
          metadata: {
            featured: true,
            bestseller: false,
          },
          options: [
            {
              title: "Size",
              values: ["15ml"],
            },
          ],
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/eye-cream.png",
            },
          ],
          variants: [
            {
              title: "15ml",
              sku: "EYE-CREAM-15ML",
              options: {
                Size: "15ml",
              },
              prices: [
                {
                  amount: 4499,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Daily Hydrating Moisturizer",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Creams")!.id,
          ],
          description:
            "Lightweight, fast-absorbing moisturizer with hyaluronic acid and ceramides. Provides 24-hour hydration for soft, supple skin.",
          handle: "moisturizer",
          weight: 100,
          status: ProductStatus.PUBLISHED,
          metadata: {
            featured: true,
            bestseller: false,
          },
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/moisturizer.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["50ml", "100ml"],
            },
          ],
          variants: [
            {
              title: "50ml",
              sku: "MOISTURIZER-50ML",
              options: {
                Size: "50ml",
              },
              prices: [
                {
                  amount: 5499,
                  currency_code: "sgd",
                },
              ],
            },
            {
              title: "100ml",
              sku: "MOISTURIZER-100ML",
              options: {
                Size: "100ml",
              },
              prices: [
                {
                  amount: 9999,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Silky Smooth Body Lotion",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Lotions")!.id,
          ],
          description:
            "Ultra-moisturizing body lotion with shea butter and vitamin E. Absorbs quickly, leaving skin silky smooth and delicately scented.",
          handle: "body-lotion",
          weight: 300,
          status: ProductStatus.PUBLISHED,
          metadata: {
            bestseller: false,
            featured: false,
          },
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/body-lotion.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["250ml", "500ml"],
            },
          ],
          variants: [
            {
              title: "250ml",
              sku: "BODY-LOTION-250ML",
              options: {
                Size: "250ml",
              },
              prices: [
                {
                  amount: 4999,
                  currency_code: "sgd",
                },
              ],
            },
            {
              title: "500ml",
              sku: "BODY-LOTION-500ML",
              options: {
                Size: "500ml",
              },
              prices: [
                {
                  amount: 8499,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Nourishing Hair Serum",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Serums")!.id,
          ],
          description:
            "Lightweight hair serum with argan oil and keratin. Tames frizz, adds shine, and protects against heat damage.",
          handle: "hair-serum",
          weight: 80,
          status: ProductStatus.PUBLISHED,
          metadata: {
            bestseller: false,
            featured: false,
          },
          options: [
            {
              title: "Size",
              values: ["50ml"],
            },
          ],
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/hair-serum.png",
            },
          ],
          variants: [
            {
              title: "50ml",
              sku: "HAIR-SERUM-50ML",
              options: {
                Size: "50ml",
              },
              prices: [
                {
                  amount: 4999,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Broad Spectrum Sunscreen SPF 50",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Sun Protection")!.id,
          ],
          description:
            "Lightweight, non-greasy sunscreen with broad-spectrum SPF 50 protection. Water-resistant and perfect for daily use.",
          handle: "sunscreen-spf50",
          weight: 100,
          status: ProductStatus.PUBLISHED,
          metadata: {
            bestseller: false,
            featured: false,
          },
          options: [
            {
              title: "Size",
              values: ["75ml"],
            },
          ],
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/sunscreen.png",
            },
          ],
          variants: [
            {
              title: "75ml",
              sku: "SUNSCREEN-75ML",
              options: {
                Size: "75ml",
              },
              prices: [
                {
                  amount: 3599,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
        {
          title: "Nourishing Lip Balm",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Lip Care")!.id,
          ],
          description:
            "Deeply moisturizing lip balm with beeswax and natural oils. Soothes dry, chapped lips and provides long-lasting hydration.",
          handle: "lip-balm",
          weight: 20,
          status: ProductStatus.PUBLISHED,
          metadata: {
            bestseller: false,
            featured: false,
          },
          options: [
            {
              title: "Size",
              values: ["10g"],
            },
          ],
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://bucket-production-917c.up.railway.app/ichida/products/lip-balm.png",
            },
          ],
          variants: [
            {
              title: "10g",
              sku: "LIP-BALM-10G",
              options: {
                Size: "10g",
              },
              prices: [
                {
                  amount: 1999,
                  currency_code: "sgd",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: defaultSalesChannel[0].id,
            },
          ],
        },
      ],
    },
  });
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 1000000,
      inventory_item_id: inventoryItem.id,
    };
    inventoryLevels.push(inventoryLevel);
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels data.");
  } // End of else block for products seeding

  // Create or upgrade admin user to owner role
  logger.info("Setting up admin user...");
  const userModuleService = container.resolve<IUserModuleService>(Modules.USER);
  const authModuleService = container.resolve<IAuthModuleService>(Modules.AUTH);
  const adminEmail = process.env.MEDUSA_ADMIN_EMAIL || "admin@lb-frozen.com";
  const adminPassword = process.env.MEDUSA_ADMIN_PASSWORD || "supersecret";

  const users = await userModuleService.listUsers({ email: adminEmail });

  if (users.length) {
    // User exists - ensure they have owner role
    const adminUser = users[0];
    const currentRole = (adminUser.metadata as Record<string, unknown>)?.role;

    if (currentRole !== "owner") {
      await userModuleService.updateUsers({
        id: adminUser.id,
        metadata: {
          ...(adminUser.metadata || {}),
          role: "owner",
          status: "Active",
        },
      });
      logger.info(`Upgraded ${adminEmail} to owner role.`);
    } else {
      logger.info(`${adminEmail} already has owner role.`);
    }

    // Check if auth identity exists for this user
    const authIdentities = await authModuleService.listAuthIdentities({
      app_metadata: { user_id: adminUser.id },
    });

    if (!authIdentities.length) {
      logger.info(`Creating auth identity for existing user ${adminEmail}...`);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const scrypt = require("scrypt-kdf");
      const hashConfig = { logN: 15, r: 8, p: 1 };
      const passwordHash = await scrypt.kdf(adminPassword, hashConfig);
      const passwordHashBase64 = passwordHash.toString("base64");

      await authModuleService.createAuthIdentities({
        app_metadata: {
          user_id: adminUser.id,
        },
        provider_identities: [
          {
            provider: "emailpass",
            entity_id: adminEmail,
            provider_metadata: {
              password: passwordHashBase64,
            },
          },
        ],
      });
      logger.info(`Created auth identity for ${adminEmail}.`);
    }
  } else {
    // User doesn't exist - create with owner role
    logger.info(`Creating admin user: ${adminEmail}`);

    // First create the user
    const createdUsers = await userModuleService.createUsers([
      {
        email: adminEmail,
        first_name: "Admin",
        last_name: "Owner",
        metadata: {
          role: "owner",
          status: "Active",
        },
      },
    ]);
    const adminUser = createdUsers[0];
    logger.info(`Created user ${adminEmail} with owner role.`);

    // Now create auth identity with password using scrypt (same as Medusa's emailpass provider)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const scrypt = require("scrypt-kdf");
    const hashConfig = { logN: 15, r: 8, p: 1 };
    const passwordHash = await scrypt.kdf(adminPassword, hashConfig);
    const passwordHashBase64 = passwordHash.toString("base64");

    await authModuleService.createAuthIdentities({
      app_metadata: {
        user_id: adminUser.id,
      },
      provider_identities: [
        {
          provider: "emailpass",
          entity_id: adminEmail,
          provider_metadata: {
            password: passwordHashBase64,
          },
        },
      ],
    });
    logger.info(`Created auth identity for ${adminEmail}.`);
  }

  logger.info("Seeding complete!");
}
