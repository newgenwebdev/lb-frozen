interface OrderSummaryProps {
  subtotal: number;
  savings: number;
  shippingCost: number;
  estimatedTotal: number;
  itemCount: number;
  onProceedToPayment?: () => void;
  isProcessing?: boolean;
  buttonText?: string;
  hideButton?: boolean;
  disabled?: boolean;
  disabledMessage?: string;
}

export function OrderSummary({
  subtotal,
  savings,
  shippingCost,
  estimatedTotal,
  itemCount,
  onProceedToPayment,
  isProcessing = false,
  buttonText,
  hideButton = false,
  disabled = false,
  disabledMessage,
}: OrderSummaryProps) {
  return (
    <div className="bg-white border rounded-2xl p-6">
      <h3 className="font-bold text-gray-900 text-lg mb-6">Order summary</h3>

      <div className="space-y-4 mb-4">
        <div className="flex justify-between text-gray-700">
          <span>Subtotal ({itemCount} items)</span>
          <span className="font-medium">RM{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center text-gray-700">
          <div className="flex items-center gap-1">
            <span>Savings</span>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="font-medium text-green-600">
            -RM{savings.toFixed(2)}
          </span>
        </div>

        <div className="border-t border-dotted border-gray-300 my-4"></div>

        <div className="flex justify-between text-gray-700">
          <span>Shipping</span>
          <span className="font-medium text-green-600">
            {shippingCost === 0
              ? "RM0 (Free)"
              : `RM${shippingCost.toFixed(2)}`}
          </span>
        </div>

        <div className="flex justify-between text-gray-700">
          <span>Taxes</span>
          <span className="font-medium text-gray-700">Shown at checkout</span>
        </div>
      </div>

      <div className="border-t border-dotted border-gray-300 pt-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-semibold">Estimated total</span>
          <span className="text-2xl font-bold text-[#23429B]">
            RM{estimatedTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Proceed Button - hidden when hideButton is true */}
      {!hideButton && (
        <div>
          <button
            onClick={onProceedToPayment}
            disabled={isProcessing || disabled}
            className="w-full py-3.5 rounded-full font-semibold text-white mb-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: disabled ? "#9CA3AF" : "linear-gradient(to bottom, #23429B, #C52129)",
            }}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              buttonText || "Proceed to payment"
            )}
          </button>
          {disabled && disabledMessage && (
            <p className="text-center text-sm text-amber-600">{disabledMessage}</p>
          )}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-gray-500">
        <svg
          className="w-4 h-4 shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <span>You can apply promo code and coin on the next step</span>
      </div>
    </div>
  );
}
