# LB Frozen Storepage (Backup)

Customer-facing storefront for the LB Frozen e-commerce platform.

## Tech Stack

- **Framework**: Next.js 16.0.10
- **React**: 19.2.3
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **API Client**: Medusa JS SDK 2.11.3
- **Payments**: Stripe
- **Animations**: Framer Motion
- **Carousel**: Swiper

## Prerequisites

- Node.js 20.x or higher
- npm or pnpm
- Running [lb-frozen-server](../server) on port 9000

## Installation

```bash
# Install dependencies
pnpm install
# or
npm install

# Copy environment template
cp .env.example .env.local

# Configure environment variables
```

## Environment Variables

Create a `.env.local` file:

```env
# Backend API URL
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000

# Medusa Publishable API Key
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY=pk_...

# Stripe Public Key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Development

```bash
# Start development server
pnpm dev
# or
npm run dev
```

The storefront runs on **port 3000** by default.

Open http://localhost:3000 in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Project Structure

```
app/
├── (routes)/                # Page routes
│   ├── page.tsx             # Homepage
│   ├── products/            # Product listing and details
│   │   ├── page.tsx         # Product listing
│   │   └── [id]/            # Product detail page
│   ├── bag/                 # Shopping cart
│   ├── checkout/            # Checkout flow
│   ├── success/             # Order confirmation
│   ├── auth/                # Authentication
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── account/             # Customer account
│   │   ├── page.tsx         # Account dashboard
│   │   ├── orders/          # Order history
│   │   └── membership/      # Membership status
│   ├── search/              # Product search
│   ├── journal/             # Blog articles
│   │   ├── page.tsx         # Article listing
│   │   └── [slug]/          # Article detail
│   ├── about/               # About page
│   ├── contact/             # Contact page
│   ├── faqs/                # FAQs
│   ├── privacy-policy/      # Privacy policy
│   ├── terms-service/       # Terms of service
│   ├── shipping-policy/     # Shipping policy
│   └── return-policy/       # Return policy
├── layout.tsx               # Root layout
├── globals.css              # Global styles
└── not-found.tsx            # 404 page

components/                  # React components
├── ui/                      # Reusable UI components
├── layout/                  # Layout components (Header, Footer)
├── products/                # Product-related components
├── cart/                    # Cart components
└── forms/                   # Form components

lib/                         # Utilities and helpers
├── medusa/                  # Medusa SDK client
├── utils/                   # Utility functions
└── types/                   # TypeScript definitions
```

## Features

### Shopping Experience
- Product browsing with categories and collections
- Advanced product search
- Product detail pages with variants
- Shopping cart with real-time updates
- Secure checkout with Stripe

### Customer Account
- User registration and authentication
- Order history and tracking
- Account settings management
- Membership status and tier benefits
- Points balance and redemption

### Content
- Blog/journal articles
- Static pages (About, Contact, FAQs)
- Policy pages (Privacy, Terms, Shipping, Returns)

### Membership & Loyalty
- View membership tier and benefits
- Points balance display
- Points redemption at checkout
- Member-exclusive pricing

## API Integration

The frontend uses Medusa JS SDK to communicate with the backend:

```typescript
import Medusa from "@medusajs/js-sdk"

const medusa = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY,
})

// Fetch products
const { products } = await medusa.store.product.list()

// Add to cart
await medusa.store.cart.addLineItem(cartId, {
  variant_id: variantId,
  quantity: 1,
})
```

## Styling Guidelines

This project uses Tailwind CSS exclusively:

```tsx
// Correct - Use Tailwind classes
<button className="rounded bg-black px-4 py-2 text-white hover:opacity-90">
  Click me
</button>

// Incorrect - Never use inline styles
<button style={{ backgroundColor: 'black', padding: '8px 16px' }}>
  Click me
</button>
```

### Text Colors
Always add explicit text color classes:

```tsx
// Correct
<h2 className="text-xl font-semibold text-neutral-900">Title</h2>

// Incorrect - relies on inheritance
<h2 className="text-xl font-semibold">Title</h2>
```

### Interactivity
Always add `cursor-pointer` to clickable elements:

```tsx
<button className="cursor-pointer rounded bg-black px-4 py-2">
  Click me
</button>
```

## Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Troubleshooting

### API Connection Issues
- Ensure backend server is running on port 9000
- Verify `NEXT_PUBLIC_MEDUSA_BACKEND_URL` in `.env.local`
- Check CORS settings in backend `.env`

### Authentication Issues
- Verify `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY` is correct
- Check browser console for token errors
- Clear localStorage and try again

### Styling Issues
- Never use inline `style` props
- Use Tailwind classes for all styling
- Check for conflicting class names

### Hydration Errors
- Ensure server and client render the same content
- Check for browser-only code in server components
- Use `'use client'` directive appropriately

## Related Projects

- [lb-frozen-server](../server) - Backend API (port 9000)
- [lb-frozen-admin](../admin) - Admin dashboard (port 3001)

## License

MIT
