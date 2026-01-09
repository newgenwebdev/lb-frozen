import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * POST /admin/products/fix-shipping-profiles
 *
 * One-time migration endpoint to assign all products without a shipping profile
 * to the default shipping profile. This is required for checkout to work properly.
 *
 * In Medusa 2.x, products are linked to shipping profiles via the Link Module.
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  try {
    // 1. Get the default shipping profile
    const { data: shippingProfiles } = await query.graph({
      entity: "shipping_profile",
      fields: ["id", "name", "type"],
    });

    if (!shippingProfiles || shippingProfiles.length === 0) {
      res.status(400).json({
        message: "No shipping profiles found. Please create a shipping profile first.",
      });
      return;
    }

    const defaultProfile = shippingProfiles[0];

    // 2. Get all products with their shipping profile links
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title", "shipping_profile.id"],
    });

    if (!products || products.length === 0) {
      res.status(200).json({
        message: "No products found.",
        updated: 0,
        skipped: 0,
      });
      return;
    }

    // 3. Filter products without shipping profile
    const productsWithoutProfile = products.filter(
      (p: { shipping_profile?: { id?: string } }) => !p.shipping_profile?.id
    );

    if (productsWithoutProfile.length === 0) {
      res.status(200).json({
        message: "All products already have shipping profiles assigned.",
        updated: 0,
        skipped: products.length,
      });
      return;
    }

    // 4. Link products to shipping profile using Remote Link
    const updated: string[] = [];
    const failed: Array<{ id: string; title: string; error: string }> = [];

    // Create links for all products
    const links = productsWithoutProfile.map((product: { id: string }) => ({
      [Modules.PRODUCT]: {
        product_id: product.id,
      },
      [Modules.FULFILLMENT]: {
        shipping_profile_id: defaultProfile.id,
      },
    }));

    try {
      await remoteLink.create(links);

      // Mark all as updated
      for (const product of productsWithoutProfile) {
        updated.push(product.title);
      }
    } catch (linkError) {
      // If bulk fails, try one by one
      console.error("Bulk link failed, trying individually:", linkError);

      for (const product of productsWithoutProfile) {
        try {
          await remoteLink.create({
            [Modules.PRODUCT]: {
              product_id: product.id,
            },
            [Modules.FULFILLMENT]: {
              shipping_profile_id: defaultProfile.id,
            },
          });
          updated.push(product.title);
        } catch (error) {
          console.error(`Failed to link product ${product.id}:`, error);
          failed.push({
            id: product.id,
            title: product.title,
            error: "Failed to link shipping profile",
          });
        }
      }
    }

    res.status(200).json({
      message: `Updated ${updated.length} products with shipping profile "${defaultProfile.name}"`,
      shippingProfile: {
        id: defaultProfile.id,
        name: defaultProfile.name,
      },
      updated: updated.length,
      skipped: products.length - productsWithoutProfile.length,
      failed: failed.length > 0 ? failed : undefined,
      updatedProducts: updated,
    });
  } catch (error) {
    console.error("Failed to fix shipping profiles:", error);
    res.status(500).json({
      message: "Failed to fix shipping profiles",
    });
  }
}
