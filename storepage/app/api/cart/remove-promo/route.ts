import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get cart_id from cookie
    const cartId = request.cookies.get('_medusa_cart_id')?.value;
    
    if (!cartId) {
      return NextResponse.json(
        { error: 'Cart not found' },
        { status: 400 }
      );
    }

    // Forward all cookies to backend (including session cookie)
    const cookieHeader = request.headers.get('cookie') || '';

    // Call Medusa backend to remove membership promo
    const medusaUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

    const response = await fetch(`${medusaUrl}/store/membership-promo/remove`, {
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
        { error: data.message || 'Failed to remove promo' },
        { status: response.status }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      cart: data.cart,
    });
  } catch (error) {
    console.error('Remove promo error:', error);
    return NextResponse.json(
      { error: 'Failed to remove promo' },
      { status: 500 }
    );
  }
}
