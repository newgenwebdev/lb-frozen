import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get cart_id from request body or cookie
    const body = await request.json();
    const cartId = body.cart_id || request.cookies.get('_medusa_cart_id')?.value;
    
    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 400 }
      );
    }

    // Forward all cookies to backend (including session cookie)
    const cookieHeader = request.headers.get('cookie') || '';

    // Call Medusa backend to apply membership promo
    const medusaUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

    const response = await fetch(`${medusaUrl}/store/membership-promo/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': publishableKey || '',
        'Cookie': cookieHeader, // Forward all cookies
      },
      body: JSON.stringify({ cart_id: cartId }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return NextResponse.json(
        { error: data.message || 'Failed to apply promo' },
        { status: response.status }
      );
    }

    const promo = data.cart?.metadata;
    
    // Return promo details
    return NextResponse.json({
      success: true,
      promo: {
        code: promo?.applied_membership_promo_name || 'MEMBER',
        type: promo?.applied_membership_promo_type || 'percentage',
        value: promo?.applied_membership_promo_value || 0,
        discount: promo?.applied_membership_promo_discount || 0,
      },
      cart: data.cart,
    });

  } catch (error) {
    console.error('Apply promo error:', error);
    return NextResponse.json(
      { error: 'Failed to apply promo code' },
      { status: 500 }
    );
  }
}
