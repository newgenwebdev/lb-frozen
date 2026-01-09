import { HomeContent } from "@/components/home/HomeContent";
import { HeroSection } from "@/components/home/HeroSection";
import {
  getBestsellerProducts,
  getFeaturedProducts,
  getProducts,
} from "@/lib/api/medusa";
import { medusaProductsToProducts } from "@/lib/api/adapter";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export default async function Home(): Promise<React.JSX.Element> {
  // Fetch bestsellers and featured products from dedicated endpoints
  // These endpoints filter server-side for better performance
  const [bestsellerMedusaProducts, featuredMedusaProducts, allMedusaProducts] =
    await Promise.all([
      getBestsellerProducts(4),
      getFeaturedProducts(4),
      getProducts(), // Fallback if custom endpoints return empty
    ]);

  // Convert to frontend format
  const bestSellers = medusaProductsToProducts(bestsellerMedusaProducts);
  const featured = medusaProductsToProducts(featuredMedusaProducts);
  const allProducts = medusaProductsToProducts(allMedusaProducts);

  // Fallback to first products if no bestsellers/featured from custom endpoints
  const bestSellersToShow =
    bestSellers.length > 0 ? bestSellers : allProducts.slice(0, 4);
  const featuredToShow =
    featured.length > 0 ? featured : allProducts.slice(4, 8);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Animations */}
      <HeroSection />

      {/* Animated Content Sections */}
      <HomeContent
        bestSellersToShow={bestSellersToShow}
        featuredToShow={featuredToShow}
      />
    </div>
  );
}
