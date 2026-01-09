// @ts-nocheck - Ignore React 18/19 type conflicts with @react-email/components
import { Text, Section, Hr, Row, Column, Img } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'
import { OrderDTO, OrderAddressDTO } from '@medusajs/framework/types'

export const ORDER_PLACED = 'order-placed'

// Helper to format price from cents to dollars
function formatPrice(cents: number | undefined | null, currencyCode: string): string {
  const amount = (Number(cents) || 0) / 100
  const currency = currencyCode?.toUpperCase() || 'SGD'
  return `$${amount.toFixed(2)} ${currency}`
}

// Helper to get original price before variant discount
function getItemOriginalPrice(item: any): number {
  const unitPrice = Number(item.unit_price) || 0
  if (item.metadata?.original_unit_price) {
    return Number(item.metadata.original_unit_price) || 0
  }
  if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
    return unitPrice + (Number(item.metadata.variant_discount_amount) || 0)
  }
  return unitPrice
}

interface OrderPlacedPreviewProps {
  order: OrderDTO & { display_id: string; summary: { raw_current_order_total: { value: number } } }
  shippingAddress: OrderAddressDTO
}

export interface OrderPlacedTemplateProps {
  order: OrderDTO & { display_id: string; summary: { raw_current_order_total: { value: number } } }
  shippingAddress: OrderAddressDTO
  preview?: string
}

export const isOrderPlacedTemplateData = (data: any): data is OrderPlacedTemplateProps =>
  typeof data.order === 'object' && typeof data.shippingAddress === 'object'

export const OrderPlacedTemplate: React.FC<OrderPlacedTemplateProps> & {
  PreviewProps: OrderPlacedPreviewProps
} = ({ order, shippingAddress, preview = 'Your order has been placed!' }) => {
  const currencyCode = order.currency_code || 'SGD'
  const items = order.items || []

  // Calculate original subtotal (before any discounts - using original prices)
  const originalSubtotal = items.reduce((sum, item: any) => {
    const originalPrice = getItemOriginalPrice(item)
    return sum + originalPrice * (Number(item.quantity) || 0)
  }, 0)

  // Calculate PWP discount
  const pwpDiscount = items.reduce((sum, item: any) => {
    if (item.metadata?.is_pwp_item && item.metadata?.pwp_discount_amount) {
      return sum + Number(item.metadata.pwp_discount_amount) * (Number(item.quantity) || 1)
    }
    return sum
  }, 0)

  // Calculate variant discount
  const variantDiscount = items.reduce((sum, item: any) => {
    if (item.metadata?.is_variant_discount && item.metadata?.variant_discount_amount) {
      return sum + Number(item.metadata.variant_discount_amount) * (Number(item.quantity) || 1)
    }
    return sum
  }, 0)

  // Get order-level discounts from metadata
  const couponDiscount = Number(order.metadata?.applied_coupon_discount) || 0
  const couponCode = order.metadata?.applied_coupon_code as string | undefined
  const pointsDiscount = Number(order.metadata?.points_discount_amount) || 0
  const pointsRedeemed = Number(order.metadata?.points_to_redeem) || 0
  const membershipPromoDiscount = Number(order.metadata?.applied_membership_promo_discount) || 0
  const membershipPromoName = order.metadata?.applied_membership_promo_name as string | undefined
  const tierDiscount = Number(order.metadata?.tier_discount_amount) || 0
  const tierDiscountPercentage = Number(order.metadata?.tier_discount_percentage) || 0
  const tierName = order.metadata?.tier_name as string | undefined

  // Shipping info - prefer EasyParcel metadata over Medusa shipping_methods
  const freeShippingApplied = order.metadata?.free_shipping_applied === true
  const freeShippingDiscount = Number(order.metadata?.free_shipping_discount) || 0
  const originalShippingCost = Number(order.metadata?.original_shipping_cost) || 0

  // Get EasyParcel shipping info from metadata (the actual selected shipping rate)
  const easyParcelShipping = order.metadata?.easyparcel_shipping as {
    price?: number
    courier_name?: string
    service_name?: string
  } | undefined

  // Calculate shipping total - prefer EasyParcel price from metadata
  let rawShippingTotal: number
  if (easyParcelShipping && typeof easyParcelShipping.price === 'number') {
    // Use EasyParcel price from metadata (the actual selected shipping rate)
    rawShippingTotal = easyParcelShipping.price
  } else {
    // Fall back to Medusa shipping_total
    rawShippingTotal = Number((order as any).shipping_total) || 0
  }

  // If free shipping was applied, the effective shipping is 0
  const shippingTotal = freeShippingApplied ? 0 : rawShippingTotal
  const taxTotal = Number((order as any).tax_total) || 0

  // Calculate final total
  const subtotalAfterItemDiscounts = originalSubtotal - pwpDiscount - variantDiscount
  const totalDiscounts = couponDiscount + pointsDiscount + membershipPromoDiscount + tierDiscount
  const calculatedTotal = Math.max(0, subtotalAfterItemDiscounts + shippingTotal + taxTotal - totalDiscounts)

  return (
    <Base preview={preview}>
      <Section>
        <Text style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 30px', color: '#000' }}>
          Order Confirmation
        </Text>

        <Text style={{ margin: '0 0 15px', color: '#333' }}>
          Dear {shippingAddress.first_name} {shippingAddress.last_name},
        </Text>

        <Text style={{ margin: '0 0 30px', color: '#333' }}>
          Thank you for your order! Here are your order details:
        </Text>

        <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px', color: '#000' }}>
          Order Summary
        </Text>
        <Text style={{ margin: '0 0 5px', color: '#333' }}>
          Order ID: #{order.display_id}
        </Text>
        <Text style={{ margin: '0 0 20px', color: '#333' }}>
          Order Date: {new Date(order.created_at).toLocaleDateString('en-SG', { year: 'numeric', month: 'long', day: 'numeric' })}
        </Text>

        <Hr style={{ margin: '20px 0', borderColor: '#E3E3E3' }} />

        <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px', color: '#000' }}>
          Shipping Address
        </Text>
        <Text style={{ margin: '0 0 5px', color: '#333' }}>
          {shippingAddress.first_name} {shippingAddress.last_name}
        </Text>
        <Text style={{ margin: '0 0 5px', color: '#333' }}>
          {shippingAddress.address_1}
        </Text>
        {shippingAddress.address_2 && (
          <Text style={{ margin: '0 0 5px', color: '#333' }}>
            {shippingAddress.address_2}
          </Text>
        )}
        <Text style={{ margin: '0 0 5px', color: '#333' }}>
          {shippingAddress.city}{shippingAddress.province ? `, ${shippingAddress.province}` : ''} {shippingAddress.postal_code}
        </Text>
        <Text style={{ margin: '0 0 20px', color: '#333' }}>
          {shippingAddress.country_code?.toUpperCase()}
        </Text>

        <Hr style={{ margin: '20px 0', borderColor: '#E3E3E3' }} />

        <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 15px', color: '#000' }}>
          Order Items
        </Text>

        {/* Order Items - Using table-like structure with Row/Column for email compatibility */}
        {items.map((item: any) => {
          const isPWP = item.metadata?.is_pwp_item
          const isVariantDiscount = item.metadata?.is_variant_discount
          const originalPrice = getItemOriginalPrice(item)
          const effectivePrice = Number(item.unit_price) || 0
          const hasDiscount = isPWP || isVariantDiscount

          return (
            <Section key={item.id} style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
              <Row>
                <Column style={{ width: '60px', verticalAlign: 'top' }}>
                  {item.thumbnail && (
                    <Img
                      src={item.thumbnail}
                      alt={item.title || 'Product'}
                      width="50"
                      height="50"
                      style={{ borderRadius: '4px', objectFit: 'cover' }}
                    />
                  )}
                </Column>
                <Column style={{ paddingLeft: '12px', verticalAlign: 'top' }}>
                  <Text style={{ margin: '0 0 4px', fontWeight: '600', color: '#000', fontSize: '14px' }}>
                    {item.title || item.product_title || 'Product'}
                  </Text>
                  {item.variant_title && item.variant_title !== item.title && (
                    <Text style={{ margin: '0 0 4px', color: '#666', fontSize: '12px' }}>
                      {item.variant_title}
                    </Text>
                  )}
                  <Text style={{ margin: '0 0 4px', color: '#666', fontSize: '12px' }}>
                    Qty: {item.quantity}
                  </Text>
                  {isPWP && (
                    <Text style={{ margin: '0', color: '#D97706', fontSize: '11px', fontWeight: '600' }}>
                      ✨ PWP Deal
                    </Text>
                  )}
                </Column>
                <Column style={{ textAlign: 'right', verticalAlign: 'top', width: '100px' }}>
                  <Text style={{ margin: '0', fontWeight: '600', color: hasDiscount ? '#16A34A' : '#000', fontSize: '14px' }}>
                    {formatPrice(effectivePrice, currencyCode)}
                  </Text>
                  {hasDiscount && (
                    <Text style={{ margin: '4px 0 0', color: '#999', fontSize: '12px', textDecoration: 'line-through' }}>
                      {formatPrice(originalPrice, currencyCode)}
                    </Text>
                  )}
                </Column>
              </Row>
            </Section>
          )
        })}

        <Hr style={{ margin: '20px 0', borderColor: '#E3E3E3' }} />

        {/* Order Summary */}
        <Text style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 15px', color: '#000' }}>
          Payment Summary
        </Text>

        {/* Subtotal */}
        <Row style={{ marginBottom: '8px' }}>
          <Column>
            <Text style={{ margin: '0', color: '#333', fontSize: '14px' }}>
              Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})
            </Text>
          </Column>
          <Column style={{ textAlign: 'right' }}>
            <Text style={{ margin: '0', color: '#333', fontSize: '14px' }}>
              {formatPrice(originalSubtotal, currencyCode)}
            </Text>
          </Column>
        </Row>

        {/* PWP Discount */}
        {pwpDiscount > 0 && (
          <Row style={{ marginBottom: '8px' }}>
            <Column>
              <Text style={{ margin: '0', color: '#D97706', fontSize: '14px' }}>
                PWP Discount
              </Text>
            </Column>
            <Column style={{ textAlign: 'right' }}>
              <Text style={{ margin: '0', color: '#D97706', fontSize: '14px' }}>
                -{formatPrice(pwpDiscount, currencyCode)}
              </Text>
            </Column>
          </Row>
        )}

        {/* Variant Discount */}
        {variantDiscount > 0 && (
          <Row style={{ marginBottom: '8px' }}>
            <Column>
              <Text style={{ margin: '0', color: '#16A34A', fontSize: '14px' }}>
                Product Discount
              </Text>
            </Column>
            <Column style={{ textAlign: 'right' }}>
              <Text style={{ margin: '0', color: '#16A34A', fontSize: '14px' }}>
                -{formatPrice(variantDiscount, currencyCode)}
              </Text>
            </Column>
          </Row>
        )}

        {/* Shipping */}
        <Row style={{ marginBottom: '8px' }}>
          <Column>
            <Text style={{ margin: '0', color: '#333', fontSize: '14px' }}>
              Shipping
            </Text>
          </Column>
          <Column style={{ textAlign: 'right' }}>
            {freeShippingApplied ? (
              <Text style={{ margin: '0', fontSize: '14px' }}>
                <span style={{ color: '#999', textDecoration: 'line-through', marginRight: '8px' }}>
                  {formatPrice(originalShippingCost, currencyCode)}
                </span>
                <span style={{ color: '#16A34A', fontWeight: '600' }}>FREE</span>
              </Text>
            ) : (
              <Text style={{ margin: '0', color: '#333', fontSize: '14px' }}>
                {formatPrice(shippingTotal, currencyCode)}
              </Text>
            )}
          </Column>
        </Row>

        {/* Tax */}
        {taxTotal > 0 && (
          <Row style={{ marginBottom: '8px' }}>
            <Column>
              <Text style={{ margin: '0', color: '#333', fontSize: '14px' }}>
                Tax
              </Text>
            </Column>
            <Column style={{ textAlign: 'right' }}>
              <Text style={{ margin: '0', color: '#333', fontSize: '14px' }}>
                {formatPrice(taxTotal, currencyCode)}
              </Text>
            </Column>
          </Row>
        )}

        {/* Coupon Discount */}
        {couponDiscount > 0 && (
          <Row style={{ marginBottom: '8px' }}>
            <Column>
              <Text style={{ margin: '0', color: '#16A34A', fontSize: '14px' }}>
                Coupon{couponCode ? ` (${couponCode})` : ''}
              </Text>
            </Column>
            <Column style={{ textAlign: 'right' }}>
              <Text style={{ margin: '0', color: '#16A34A', fontSize: '14px' }}>
                -{formatPrice(couponDiscount, currencyCode)}
              </Text>
            </Column>
          </Row>
        )}

        {/* Points Discount */}
        {pointsDiscount > 0 && (
          <Row style={{ marginBottom: '8px' }}>
            <Column>
              <Text style={{ margin: '0', color: '#D97706', fontSize: '14px' }}>
                Points{pointsRedeemed > 0 ? ` (${pointsRedeemed.toLocaleString()} pts)` : ''}
              </Text>
            </Column>
            <Column style={{ textAlign: 'right' }}>
              <Text style={{ margin: '0', color: '#D97706', fontSize: '14px' }}>
                -{formatPrice(pointsDiscount, currencyCode)}
              </Text>
            </Column>
          </Row>
        )}

        {/* Membership Promo Discount */}
        {membershipPromoDiscount > 0 && (
          <Row style={{ marginBottom: '8px' }}>
            <Column>
              <Text style={{ margin: '0', color: '#9333EA', fontSize: '14px' }}>
                Member Discount{membershipPromoName ? ` (${membershipPromoName})` : ''}
              </Text>
            </Column>
            <Column style={{ textAlign: 'right' }}>
              <Text style={{ margin: '0', color: '#9333EA', fontSize: '14px' }}>
                -{formatPrice(membershipPromoDiscount, currencyCode)}
              </Text>
            </Column>
          </Row>
        )}

        {/* Tier Discount */}
        {tierDiscount > 0 && (
          <Row style={{ marginBottom: '8px' }}>
            <Column>
              <Text style={{ margin: '0', color: '#2563EB', fontSize: '14px' }}>
                {tierName || 'Member'}{tierDiscountPercentage > 0 ? ` (${tierDiscountPercentage}% off)` : ''}
              </Text>
            </Column>
            <Column style={{ textAlign: 'right' }}>
              <Text style={{ margin: '0', color: '#2563EB', fontSize: '14px' }}>
                -{formatPrice(tierDiscount, currencyCode)}
              </Text>
            </Column>
          </Row>
        )}

        <Hr style={{ margin: '16px 0', borderColor: '#E3E3E3' }} />

        {/* Total */}
        <Row>
          <Column>
            <Text style={{ margin: '0', color: '#000', fontSize: '18px', fontWeight: 'bold' }}>
              Total
            </Text>
          </Column>
          <Column style={{ textAlign: 'right' }}>
            <Text style={{ margin: '0', color: '#000', fontSize: '18px', fontWeight: 'bold' }}>
              {formatPrice(calculatedTotal, currencyCode)}
            </Text>
          </Column>
        </Row>

        {/* Savings Summary */}
        {(pwpDiscount + variantDiscount + totalDiscounts + (freeShippingApplied ? freeShippingDiscount : 0)) > 0 && (
          <Row style={{ marginTop: '12px' }}>
            <Column>
              <Text style={{ margin: '0', color: '#16A34A', fontSize: '13px', fontWeight: '600' }}>
                🎉 You saved {formatPrice(pwpDiscount + variantDiscount + totalDiscounts + (freeShippingApplied ? freeShippingDiscount : 0), currencyCode)} on this order!
              </Text>
            </Column>
          </Row>
        )}

        <Hr style={{ margin: '24px 0', borderColor: '#E3E3E3' }} />

        <Text style={{ margin: '0', color: '#666', fontSize: '13px', textAlign: 'center' }}>
          If you have any questions about your order, please contact our support team.
        </Text>
      </Section>
    </Base>
  )
}

OrderPlacedTemplate.PreviewProps = {
  order: {
    id: 'test-order-id',
    display_id: '28',
    created_at: new Date().toISOString(),
    email: 'test@example.com',
    currency_code: 'SGD',
    shipping_total: 500, // $5.00
    tax_total: 0,
    items: [
      {
        id: 'item-1',
        title: 'Nourishing Hair Serum',
        product_title: 'Nourishing Hair Serum',
        variant_title: '50ml',
        quantity: 8,
        unit_price: 4999, // $49.99
        thumbnail: 'https://example.com/product.jpg',
        metadata: {}
      }
    ],
    shipping_address: {
      first_name: 'Ode',
      last_name: 'Ardika',
      address_1: 'Blk670A 07-80',
      city: 'Singapore',
      province: '',
      postal_code: '641670',
      country_code: 'sg'
    },
    metadata: {
      tier_discount_amount: 5999, // $59.99
      tier_discount_percentage: 15,
      tier_name: 'Platinum',
      free_shipping_applied: true,
      free_shipping_discount: 500,
      original_shipping_cost: 500,
      // EasyParcel shipping info example
      easyparcel_shipping: {
        price: 369, // $3.69
        courier_name: 'MRight Pte Ltd',
        service_name: 'MRight'
      }
    },
    summary: { raw_current_order_total: { value: 33993 } }
  },
  shippingAddress: {
    first_name: 'Ode',
    last_name: 'Ardika',
    address_1: 'Blk670A 07-80',
    city: 'Singapore',
    province: '',
    postal_code: '641670',
    country_code: 'sg'
  }
} as OrderPlacedPreviewProps

export default OrderPlacedTemplate
