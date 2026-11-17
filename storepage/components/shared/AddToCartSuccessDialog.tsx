"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CartProduct {
  name: string;
  price: number;
  image?: string;
  quantity: number;
  variantTitle?: string;
}

interface AddToCartSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: CartProduct | null;
}

// Helper function to format price from cents to RM
function formatPrice(amountInCents: number): string {
  return `RM${(amountInCents / 100).toFixed(2)}`;
}

export function AddToCartSuccessDialog({
  open,
  onOpenChange,
  product,
}: AddToCartSuccessDialogProps) {
  const router = useRouter();

  const handleGoToCart = () => {
    onOpenChange(false);
    router.push("/cart");
  };

  const handleContinueExplore = () => {
    onOpenChange(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 rounded-2xl">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Shopping Bag Illustration */}
          <div className="w-40 h-40 relative">
            <Image
              src="/illustration-shopping-bag.png"
              alt="Shopping bag"
              width={200}
              height={160}
              className="mx-auto"
            />
          </div>

          {/* Success Title */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Success add to cart
            </h2>
            <p className="text-gray-500 text-sm">
              Check now and buy immediately, beware that the stock will run out
              soon!
            </p>
          </div>

          {/* Product Card */}
          <div className="w-full bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-4">
              {/* Product Image */}
              <div className="w-16 h-16 relative rounded-lg overflow-hidden bg-white shrink-0">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1 text-left min-w-0 overflow-hidden">
                <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-lg font-bold text-red-600">
                  {formatPrice(product.price * product.quantity)}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3 pt-2">
            <Button
              onClick={handleGoToCart}
              className="w-full bg-linear-to-r from-indigo-600 to-rose-600 hover:from-indigo-700 hover:to-rose-700 text-white font-medium py-6 rounded-xl text-base"
            >
              Go to cart
            </Button>
            <Button
              onClick={handleContinueExplore}
              variant="outline"
              className="w-full border-gray-300 text-gray-700 font-medium py-6 rounded-xl hover:bg-gray-50 text-base"
            >
              Continue explore
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddToCartSuccessDialog;
