'use client';

import { useAuthContext } from '@/lib/AuthContext';
import { CUSTOMER_ROLES } from '@/lib/api/types';

interface PriceDisplayProps {
  /** Retail price in cents */
  retailPrice: number;
  /** Bulk price in cents (optional) */
  bulkPrice?: number;
  /** VIP price in cents (optional) */
  vipPrice?: number;
  /** Original price before discount (for showing strikethrough) */
  originalPrice?: number;
  /** Currency code */
  currency?: string;
  /** Show all available prices (for comparison) */
  showAllPrices?: boolean;
  /** Custom class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * PriceDisplay Component
 * Shows the appropriate price based on user's role/tier
 * - Guests/Retail: See retail price only
 * - Bulk customers: See bulk price (or retail if no bulk price)
 * - VIP customers: See VIP price (best price available)
 */
export default function PriceDisplay({
  retailPrice,
  bulkPrice,
  vipPrice,
  originalPrice,
  currency = 'RM',
  showAllPrices = false,
  className = '',
  size = 'md',
}: PriceDisplayProps) {
  const { role, canSeeBulkPrices, canSeeVIPPrices, isAuthenticated } = useAuthContext();

  // Determine which price to show based on role
  const getDisplayPrice = (): number => {
    if (role === CUSTOMER_ROLES.VIP && vipPrice) {
      return vipPrice;
    }
    if (role === CUSTOMER_ROLES.BULK && bulkPrice) {
      return bulkPrice;
    }
    return retailPrice;
  };

  // Format price from cents to display string
  const formatPrice = (priceInCents: number): string => {
    return `${currency}${(priceInCents / 100).toFixed(2)}`;
  };

  const displayPrice = getDisplayPrice();
  const hasDiscount = originalPrice && originalPrice > displayPrice;

  // Size classes
  const sizeClasses = {
    sm: {
      main: 'text-sm font-semibold',
      original: 'text-xs',
      badge: 'text-[10px] px-1.5 py-0.5',
    },
    md: {
      main: 'text-lg font-bold',
      original: 'text-sm',
      badge: 'text-xs px-2 py-1',
    },
    lg: {
      main: 'text-2xl font-bold',
      original: 'text-base',
      badge: 'text-sm px-2.5 py-1',
    },
  };

  const classes = sizeClasses[size];

  // Calculate discount percentage
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
    : 0;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Main price display */}
      <div className="flex items-center gap-2">
        <span className={`${classes.main} text-gray-900`}>
          {formatPrice(displayPrice)}
        </span>
        
        {hasDiscount && (
          <span className={`${classes.original} text-gray-400 line-through`}>
            {formatPrice(originalPrice)}
          </span>
        )}

        {discountPercent > 0 && (
          <span className={`${classes.badge} bg-[#C52129] text-white rounded-full font-semibold`}>
            {discountPercent}% OFF
          </span>
        )}
      </div>

      {/* Role-based price badge */}
      {isAuthenticated && role !== CUSTOMER_ROLES.RETAIL && (
        <div className="mt-1">
          <span className={`${classes.badge} inline-block rounded-full font-medium ${
            role === CUSTOMER_ROLES.VIP 
              ? 'bg-amber-100 text-amber-800' 
              : role === CUSTOMER_ROLES.BULK 
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
          }`}>
            {role === CUSTOMER_ROLES.VIP && '⭐ VIP Price'}
            {role === CUSTOMER_ROLES.BULK && '📦 Bulk Price'}
            {role === CUSTOMER_ROLES.SUPPLIER && '🏭 Supplier Price'}
          </span>
        </div>
      )}

      {/* Show all prices comparison (optional) */}
      {showAllPrices && isAuthenticated && (
        <div className="mt-2 text-xs text-gray-500 space-y-0.5">
          <div className="flex justify-between">
            <span>Retail:</span>
            <span>{formatPrice(retailPrice)}</span>
          </div>
          {canSeeBulkPrices && bulkPrice && (
            <div className="flex justify-between">
              <span>Bulk:</span>
              <span className={role === CUSTOMER_ROLES.BULK ? 'font-semibold text-blue-600' : ''}>
                {formatPrice(bulkPrice)}
              </span>
            </div>
          )}
          {canSeeVIPPrices && vipPrice && (
            <div className="flex justify-between">
              <span>VIP:</span>
              <span className={role === CUSTOMER_ROLES.VIP ? 'font-semibold text-amber-600' : ''}>
                {formatPrice(vipPrice)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple inline price display
 */
export function InlinePrice({
  price,
  originalPrice,
  currency = 'RM',
  className = '',
}: {
  price: number;
  originalPrice?: number;
  currency?: string;
  className?: string;
}) {
  const formatPrice = (priceInCents: number): string => {
    return `${currency}${(priceInCents / 100).toFixed(2)}`;
  };

  return (
    <span className={className}>
      <span className="font-bold text-gray-900">{formatPrice(price)}</span>
      {originalPrice && originalPrice > price && (
        <span className="ml-1 text-gray-400 line-through text-sm">
          {formatPrice(originalPrice)}
        </span>
      )}
    </span>
  );
}
