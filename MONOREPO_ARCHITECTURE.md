# LB Frozen Monorepo Architecture & Integration Guide

**Last Updated:** January 8, 2026  
**Version:** 1.0.0

---

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Technology Stack](#technology-stack)
4. [Backend Architecture (Server)](#backend-architecture-server)
5. [Storepage Integration](#storepage-integration)
6. [Admin Dashboard](#admin-dashboard)
7. [Custom Modules](#custom-modules)
8. [API Endpoints](#api-endpoints)
9. [Environment Configuration](#environment-configuration)
10. [Development Workflow](#development-workflow)
11. [Key Features Implementation](#key-features-implementation)

---

## Overview

LB Frozen is a full-stack e-commerce platform built as a **pnpm monorepo** with three main projects working together:

- **Server** (Backend API) - Medusa.js 2.10.2 backend with PostgreSQL
- **Storepage** (Customer Storefront) - Next.js 16 + React 19 customer-facing app
- **Admin** (Admin Dashboard) - Next.js 16 + React 19 management interface

### Architecture Philosophy
- **Monorepo Benefits**: Shared configurations, unified versioning, synchronized development
- **Separation of Concerns**: Backend, storefront, and admin are independent yet integrated
- **API-First Design**: All business logic in backend, frontends consume REST APIs
- **Type Safety**: Full TypeScript implementation across all projects

---

## Project Structure

```
lb-frozen/
├── package.json                 # Root workspace configuration
├── pnpm-workspace.yaml          # pnpm workspace definition
├── pnpm-lock.yaml              # Unified dependency lock
├── README.md                   # Main documentation
├── GUIDELINES.md               # Development standards
├── MONOREPO_ARCHITECTURE.md    # This file
│
├── server/                     # Backend API (Port 9000)
│   ├── src/
│   │   ├── api/               # Custom API routes
│   │   │   ├── admin/        # Admin-specific endpoints
│   │   │   ├── store/        # Storefront endpoints
│   │   │   └── webhooks/     # External service webhooks
│   │   ├── modules/           # Custom Medusa modules
│   │   │   ├── membership/   # Customer membership system
│   │   │   ├── points/       # Points/rewards system
│   │   │   ├── promo/        # Promotional campaigns
│   │   │   ├── tier-config/  # Tier pricing configuration
│   │   │   ├── pwp/          # Purchase with Purchase
│   │   │   ├── return/       # Returns management
│   │   │   └── ...
│   │   ├── subscribers/       # Event subscribers
│   │   ├── workflows/         # Custom workflows
│   │   └── scripts/          # Utility scripts
│   ├── medusa-config.js       # Medusa configuration
│   ├── package.json           # @lb-frozen/server
│   └── .env                   # Server environment variables
│
├── storepage/                  # Customer Storefront (Port 3000)
│   ├── app/                   # Next.js 16 App Router
│   │   ├── landing/          # Homepage
│   │   ├── product/          # Product pages
│   │   ├── cart/             # Shopping cart
│   │   ├── checkout/         # Checkout process
│   │   ├── payment/          # Payment page
│   │   ├── orders/           # Order history
│   │   ├── profile/          # User profile
│   │   ├── my-address/       # Address management
│   │   └── ...
│   ├── components/            # Reusable UI components
│   │   ├── layout/           # Layout components
│   │   ├── shared/           # Shared components
│   │   └── ui/               # shadcn/ui components
│   ├── lib/                   # Utilities & helpers
│   ├── package.json           # @lb-frozen/storepage
│   └── .env.local             # Storepage environment variables
│
├── admin/                      # Admin Dashboard (Port 3001)
│   ├── app/                   # Next.js 16 App Router
│   │   ├── (auth)/           # Authentication pages
│   │   └── admin/            # Admin pages
│   │       ├── orders/       # Order management
│   │       ├── products/     # Product management
│   │       ├── customers/    # Customer management
│   │       ├── membership/   # Membership settings
│   │       ├── promos/       # Promotion management
│   │       └── ...
│   ├── components/            # Admin UI components
│   ├── lib/                   # API clients & utilities
│   │   ├── api/              # API service layer
│   │   │   ├── client.ts    # Axios instance
│   │   │   ├── orders.ts    # Order APIs
│   │   │   ├── products.ts  # Product APIs
│   │   │   └── ...
│   │   └── utils/            # Helper functions
│   ├── package.json           # @lb-frozen/admin
│   └── .env.local             # Admin environment variables
│
└── storepage-backup/           # Legacy storefront (Reference only)
```

---

## Technology Stack

### Backend (Server)
| Technology | Version | Purpose |
|------------|---------|---------|
| **Medusa.js** | 2.10.2 | E-commerce framework |
| **Node.js** | 22.x+ | JavaScript runtime |
| **TypeScript** | 5.7 | Type safety |
| **PostgreSQL** | 15+ | Primary database |
| **MikroORM** | 6.4.3 | ORM for database |
| **Redis** | Latest | Caching & sessions |
| **MinIO** | 8.0.3 | Object storage (S3-compatible) |
| **Stripe** | 14.0.0 | Payment processing |
| **Resend** | 4.0.1 | Transactional emails |
| **Meilisearch** | Optional | Search engine |

### Storepage (Customer Storefront)
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.1.1 | React framework |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5+ | Type safety |
| **Tailwind CSS** | 4 | Styling framework |
| **Radix UI** | Latest | Headless UI components |
| **Lucide React** | 0.562.0 | Icon library |

### Admin (Admin Dashboard)
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 16.0.10 | React framework |
| **React** | 19.2.3 | UI library |
| **TypeScript** | 5.9.3 | Type safety |
| **Tailwind CSS** | 4 | Styling framework |
| **Zustand** | 5.0.8 | State management |
| **React Query** | 5.90.10 | Data fetching |
| **Axios** | 1.13.2 | HTTP client |
| **Zod** | 4.1.12 | Schema validation |
| **React Hook Form** | 7.69.0 | Form management |

---

## Backend Architecture (Server)

### Core Components

#### 1. **Medusa Configuration** (`medusa-config.js`)

```javascript
{
  projectConfig: {
    databaseUrl: DATABASE_URL,           // PostgreSQL connection
    redisUrl: REDIS_URL,                 // Redis for caching
    http: {
      adminCors: ADMIN_CORS,             // Admin CORS settings
      storeCors: STORE_CORS,             // Store CORS settings
      jwtSecret: JWT_SECRET,             // JWT authentication
      cookieSecret: COOKIE_SECRET        // Session cookies
    }
  },
  modules: {
    // File storage (MinIO or local)
    [Modules.FILE]: { /* ... */ },
    
    // Notification system (Resend/SendGrid)
    [Modules.NOTIFICATION]: { /* ... */ },
    
    // Payment integration (Stripe)
    [Modules.PAYMENT]: { /* ... */ },
    
    // Custom modules
    [MEMBERSHIP_MODULE]: { /* ... */ },
    [POINTS_MODULE]: { /* ... */ },
    [PROMO_MODULE]: { /* ... */ },
    // ... more custom modules
  }
}
```

#### 2. **Database Schema**

The server uses **PostgreSQL** with MikroORM for:
- Products, variants, inventory
- Orders and fulfillments
- Customers and addresses
- Custom tables (membership, points, promos, etc.)

#### 3. **File Storage**

**MinIO Configuration** (S3-compatible):
```javascript
{
  endPoint: MINIO_ENDPOINT,
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
  bucket: 'lb-frozen'                   // Default bucket name
}
```

**Fallback**: Local file storage at `static/` directory

---

## Storepage Integration

### How Storepage Connects to Server

The storepage is currently a **standalone Next.js application** that needs to be integrated with the backend API.

#### Current State (Not Integrated)
```typescript
// storepage/app/layout.tsx
export const metadata: Metadata = {
  title: "LB Frozen - Premium Seafood",
  description: "Buy premium frozen seafood products online",
};

// Currently using mock/static data
// No API calls to backend server
```

#### Integration Requirements

### Step 1: Install Medusa JS SDK

```bash
cd storepage
pnpm add @medusajs/js-sdk
```

### Step 2: Create API Client

Create `storepage/lib/api/medusa.ts`:

```typescript
import Medusa from "@medusajs/js-sdk";

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY;

// Initialize Medusa SDK
export const medusa = new Medusa({
  baseUrl: BACKEND_URL,
  publishableKey: PUBLISHABLE_API_KEY,
  auth: {
    type: "session"  // or "jwt"
  }
});

// Export for use in components
export default medusa;
```

### Step 3: Environment Variables

Create `storepage/.env.local`:

```env
# Backend API
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000

# Publishable API Key (get from Medusa admin)
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY=pk_...

# Optional: Region
NEXT_PUBLIC_DEFAULT_REGION=sg
```

### Step 4: Fetch Products Example

```typescript
// storepage/app/landing/page.tsx
import { medusa } from "@/lib/api/medusa";

export default async function LandingPage() {
  // Fetch products from backend
  const { products } = await medusa.store.product.list({
    fields: "*variants,*images,*categories",
    limit: 12
  });

  return (
    <div>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Step 5: Cart Integration

```typescript
// storepage/lib/api/cart.ts
import { medusa } from "./medusa";

const CART_ID_KEY = 'lb-frozen-cart-id';

// Get or create cart
export async function getOrCreateCart() {
  let cartId = localStorage.getItem(CART_ID_KEY);
  
  if (cartId) {
    try {
      const { cart } = await medusa.store.cart.retrieve(cartId);
      return cart;
    } catch {
      // Cart not found, create new
    }
  }
  
  const { cart } = await medusa.store.cart.create({
    region_id: await getDefaultRegionId()
  });
  
  localStorage.setItem(CART_ID_KEY, cart.id);
  return cart;
}

// Add item to cart
export async function addToCart(variantId: string, quantity: number) {
  const cart = await getOrCreateCart();
  
  const { cart: updatedCart } = await medusa.store.cart.lineItem.create(cart.id, {
    variant_id: variantId,
    quantity
  });
  
  return updatedCart;
}
```

### Step 6: Authentication Integration

```typescript
// storepage/lib/api/auth.ts
import { medusa } from "./medusa";

const AUTH_TOKEN_KEY = 'lb-frozen-auth-token';

// Customer login
export async function login(email: string, password: string) {
  const { customer } = await medusa.auth.login({
    email,
    password
  });
  
  const token = medusa.auth.getToken();
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  
  return customer;
}

// Customer logout
export async function logout() {
  await medusa.auth.logout();
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Get current customer
export async function getCurrentCustomer() {
  try {
    const { customer } = await medusa.store.customer.retrieve();
    return customer;
  } catch {
    return null;
  }
}
```

---

## Admin Dashboard

### Admin API Integration

The admin uses **Axios** for API calls with authentication:

```typescript
// admin/lib/api/client.ts
import axios from "axios";

const DEFAULT_API_URL = "http://localhost:9000";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor - Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

### Admin API Examples

```typescript
// admin/lib/api/products.ts
import { api } from "./client";

// Fetch products
export async function getProducts(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const response = await api.get("/admin/products", { params });
  return response.data;
}

// Create product
export async function createProduct(data: ProductData) {
  const response = await api.post("/admin/products", data);
  return response.data;
}
```

---

## Custom Modules

The server includes several custom Medusa modules for extended functionality:

### 1. **Membership Module** (`membership`)
**Purpose**: Manage customer membership tiers and benefits

**Services**:
- `MembershipModuleService` - CRUD operations for memberships
- `GroupManagerService` - Customer group management

**Database Tables**:
- `memberships` - Customer membership records
- `membership_groups` - Tier configurations

**API Endpoints**:
- `GET /store/membership` - Get customer membership
- `POST /store/membership/purchase` - Purchase/upgrade membership
- `GET /admin/membership` - List all memberships

### 2. **Points Module** (`points`)
**Purpose**: Loyalty points system

**Services**:
- `PointsModuleService` - Points CRUD and calculations

**Features**:
- Earn points on purchases
- Redeem points for discounts
- Points expiration
- Transaction history

**API Endpoints**:
- `GET /store/points/balance` - Get customer points balance
- `POST /store/cart/apply-points` - Apply points to cart
- `GET /store/points/transactions` - Points transaction history

### 3. **Promo Module** (`promo`)
**Purpose**: Promotional campaigns and codes

**Services**:
- `PromoModuleService` - Promo CRUD and validation

**Features**:
- Discount codes
- Time-based promotions
- Usage limits
- Category/product-specific promos

**API Endpoints**:
- `POST /store/cart/apply-coupon` - Apply promo code
- `DELETE /store/cart/remove-coupon` - Remove promo code
- `GET /admin/promos` - Manage promotions

### 4. **Tier Config Module** (`tier-config`)
**Purpose**: Bulk pricing tiers

**Features**:
- Volume-based pricing
- Customer tier discounts
- Wholesale pricing

### 5. **PWP Module** (Purchase with Purchase)
**Purpose**: Bundle deals and upsells

**Features**:
- "Buy X, get Y at discount"
- Conditional product offers
- Cart-based triggers

### 6. **Return Module** (`return`)
**Purpose**: Returns and refunds management

**Features**:
- Return requests
- Return shipping labels (EasyParcel integration)
- Refund processing

### 7. **Article Module** (`article`)
**Purpose**: Content management (blog/news)

### 8. **Banner Module** (`banner`)
**Purpose**: Marketing banners and promotions

### 9. **Brand Module** (`brand`)
**Purpose**: Brand/manufacturer management

### 10. **Shipping Settings Module** (`shipping-settings`)
**Purpose**: Advanced shipping configurations

---

## API Endpoints

### Store API (Storefront)

#### **Authentication**
```
POST   /store/auth/register              # Customer registration
POST   /store/auth/login                 # Customer login
POST   /store/auth/logout                # Customer logout
GET    /store/customer                   # Get current customer
PUT    /store/customer                   # Update customer
POST   /store/auth/resend-verification   # Resend email verification
```

#### **Products**
```
GET    /store/products                   # List products
GET    /store/products/:id               # Get product details
GET    /store/products/search            # Search products
GET    /store/categories                 # List categories
GET    /store/brands                     # List brands
```

#### **Cart**
```
POST   /store/carts                      # Create cart
GET    /store/carts/:id                  # Get cart
POST   /store/carts/:id/line-items       # Add item to cart
PUT    /store/carts/:id/line-items/:lineId  # Update cart item
DELETE /store/carts/:id/line-items/:lineId  # Remove cart item
POST   /store/carts/:id/apply-coupon     # Apply coupon code
DELETE /store/carts/:id/remove-coupon    # Remove coupon
POST   /store/carts/:id/apply-points     # Apply points
```

#### **Checkout**
```
POST   /store/carts/:id/shipping-methods # Select shipping method
POST   /store/carts/:id/payment-session  # Create payment session
POST   /store/carts/:id/complete         # Complete order
```

#### **Orders**
```
GET    /store/customer/orders            # Get customer orders
GET    /store/customer-orders/:id        # Get order details
GET    /store/customer-orders/:id/invoice # Download invoice PDF
POST   /store/orders/:id/return          # Request return
```

#### **Membership**
```
GET    /store/membership                 # Get membership status
POST   /store/membership/purchase        # Purchase membership
GET    /store/membership-promo           # Get membership promos
GET    /store/tiers                      # Get pricing tiers
```

#### **Points**
```
GET    /store/points/balance             # Get points balance
GET    /store/points/transactions        # Get points history
```

#### **Content**
```
GET    /store/articles                   # Get blog articles
GET    /store/articles/:id               # Get article details
GET    /store/banners                    # Get active banners
```

### Admin API

#### **Products**
```
GET    /admin/products                   # List products
POST   /admin/products                   # Create product
GET    /admin/products/:id               # Get product
PUT    /admin/products/:id               # Update product
DELETE /admin/products/:id               # Delete product
POST   /admin/uploads                    # Upload images
```

#### **Orders**
```
GET    /admin/orders                     # List orders
GET    /admin/orders/:id                 # Get order
PUT    /admin/orders/:id                 # Update order
POST   /admin/orders/:id/fulfillment     # Create fulfillment
POST   /admin/orders/:id/shipment        # Ship order
```

#### **Customers**
```
GET    /admin/customers                  # List customers
GET    /admin/customers/:id              # Get customer
PUT    /admin/customers/:id              # Update customer
```

#### **Membership Management**
```
GET    /admin/membership                 # List memberships
PUT    /admin/membership/:id             # Update membership
GET    /admin/tiers                      # Manage tier configs
POST   /admin/tiers                      # Create tier
```

#### **Promotions**
```
GET    /admin/promos                     # List promos
POST   /admin/promos                     # Create promo
PUT    /admin/promos/:id                 # Update promo
DELETE /admin/promos/:id                 # Delete promo
```

#### **Returns**
```
GET    /admin/returns                    # List returns
PUT    /admin/returns/:id                # Update return
POST   /admin/returns/:id/approve        # Approve return
```

---

## Environment Configuration

### Server Environment (`.env`)

```env
# ============================================================
# LB FROZEN SERVER ENVIRONMENT CONFIGURATION
# ============================================================

# === ENVIRONMENT ===
NODE_ENV=development

# === DATABASE ===
DATABASE_URL=postgresql://postgres:password@localhost:5432/lb_frozen

# === PUBLIC URL ===
BACKEND_URL=http://localhost:9000

# === CORS ===
STORE_CORS=http://localhost:3000,http://localhost:3001
ADMIN_CORS=http://localhost:3001

# === SECURITY ===
JWT_SECRET=your-jwt-secret-key-here
COOKIE_SECRET=your-cookie-secret-key-here

# === MEDUSA ADMIN ===
MEDUSA_ADMIN_EMAIL=admin@lb-frozen.com
MEDUSA_ADMIN_PASSWORD=supersecret

# === FILE STORAGE (MinIO) ===
MINIO_ENDPOINT=localhost
MINIO_PORT=9001
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=lb-frozen
MINIO_USE_SSL=false

# === REDIS (Optional) ===
REDIS_URL=redis://localhost:6379

# === PAYMENT (Stripe) ===
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# === EMAIL (Resend) ===
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@lb-frozen.com

# === SEARCH (Meilisearch - Optional) ===
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_ADMIN_KEY=masterKey

# === SHIPPING (EasyParcel) ===
EASYPARCEL_API_KEY=your-api-key
EASYPARCEL_API_URL=https://connect.easyparcel.com/api/v2
```

### Storepage Environment (`.env.local`)

```env
# ============================================================
# LB FROZEN STOREPAGE ENVIRONMENT CONFIGURATION
# ============================================================

# === BACKEND API ===
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000

# === PUBLISHABLE API KEY ===
# Get this from Medusa admin dashboard
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY=pk_...

# === DEFAULT REGION ===
NEXT_PUBLIC_DEFAULT_REGION=sg

# === ANALYTICS (Optional) ===
NEXT_PUBLIC_GA_ID=G-...
```

### Admin Environment (`.env.local`)

```env
# ============================================================
# LB FROZEN ADMIN ENVIRONMENT CONFIGURATION
# ============================================================

# === BACKEND API ===
NEXT_PUBLIC_API_URL=http://localhost:9000

# === ADMIN CREDENTIALS (Development only) ===
# Don't use in production!
DEV_ADMIN_EMAIL=admin@lb-frozen.com
DEV_ADMIN_PASSWORD=supersecret
```

---

## Development Workflow

### 1. Initial Setup

```bash
# Clone repository
git clone git@github.com:newgenwebdev/lb-frozen.git
cd lb-frozen

# Install pnpm globally (if not installed)
npm install -g pnpm

# Install all dependencies
pnpm install

# Setup environment files
cp server/.env.example server/.env
cp storepage/.env.example storepage/.env.local
cp admin/.env.example admin/.env.local

# Configure environment variables (edit the .env files)
```

### 2. Database Setup

```bash
# Start PostgreSQL (via Docker)
docker run -d \
  --name lb-frozen-db \
  -e POSTGRES_DB=lb_frozen \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15

# Run migrations (from server directory)
cd server
pnpm run build
pnpm medusa migrations run

# Seed database
pnpm medusa exec ./src/scripts/seed.ts
```

### 3. Start Development Servers

```bash
# From root directory, open 3 terminals:

# Terminal 1 - Backend (port 9000)
pnpm dev:server

# Terminal 2 - Storepage (port 3000)
pnpm dev:storepage

# Terminal 3 - Admin (port 3001)
pnpm dev:admin
```

### 4. Access Applications

| Service | URL | Credentials |
|---------|-----|-------------|
| Backend API | http://localhost:9000 | - |
| API Docs | http://localhost:9000/docs | - |
| Medusa Admin | http://localhost:9000/app | admin@lb-frozen.com / supersecret |
| Storepage | http://localhost:3000 | (Register new customer) |
| Admin Dashboard | http://localhost:3001 | admin@lb-frozen.com / supersecret |

### 5. Building for Production

```bash
# Build all projects
pnpm run build:server
pnpm run build:storepage
pnpm run build:admin

# Or build all at once (add to root package.json)
pnpm run build:all
```

---

## Key Features Implementation

### 1. **Membership System**

**Backend Implementation**:
```typescript
// server/src/modules/membership/services/membership.ts
class MembershipModuleService {
  async purchaseMembership(customerId: string, tierId: string) {
    // Create membership record
    // Assign customer to group
    // Apply tier benefits
  }
}
```

**Storepage Integration**:
```typescript
// storepage/lib/api/membership.ts
import { medusa } from "./medusa";

export async function getMembershipStatus() {
  const { data } = await medusa.client.request(
    "GET",
    "/store/membership"
  );
  return data.membership;
}

export async function purchaseMembership(tierId: string) {
  const { data } = await medusa.client.request(
    "POST",
    "/store/membership/purchase",
    { tier_id: tierId }
  );
  return data.membership;
}
```

### 2. **Points System**

**Backend**:
- Points earned on order completion
- Points can be redeemed for discounts
- Points history tracking

**Storepage**:
```typescript
// storepage/lib/api/points.ts
export async function getPointsBalance() {
  const { data } = await medusa.client.request(
    "GET",
    "/store/points/balance"
  );
  return data.balance;
}

export async function applyPoints(cartId: string, points: number) {
  const { data } = await medusa.client.request(
    "POST",
    `/store/cart/${cartId}/apply-points`,
    { points }
  );
  return data.cart;
}
```

### 3. **Bulk Pricing / Tier Pricing**

**Backend**:
- Price variants based on quantity
- Customer tier discounts
- Wholesale pricing

**Storepage**:
```typescript
// Calculate effective price based on quantity and tier
export async function getEffectivePrice(
  variantId: string,
  quantity: number
) {
  const { data } = await medusa.client.request(
    "GET",
    `/store/products/variant/${variantId}/price`,
    { quantity }
  );
  return data.price;
}
```

### 4. **PWP (Purchase with Purchase)**

**Backend**:
- Define PWP offers
- Validate cart eligibility
- Apply PWP discounts

**Storepage**:
```typescript
// Get available PWP offers for cart
export async function getPWPOffers(cartId: string) {
  const { data } = await medusa.client.request(
    "GET",
    `/store/pwp/${cartId}/offers`
  );
  return data.offers;
}
```

### 5. **Returns Management**

**Backend**:
- Return request workflow
- EasyParcel label generation
- Refund processing

**Admin**:
```typescript
// admin/lib/api/returns.ts
export async function approveReturn(returnId: string) {
  const { data } = await api.post(
    `/admin/returns/${returnId}/approve`
  );
  return data.return;
}
```

---

## Integration Checklist

### For Storepage Developer

- [ ] Install `@medusajs/js-sdk`
- [ ] Create `lib/api/medusa.ts` with SDK initialization
- [ ] Add environment variables to `.env.local`
- [ ] Get Publishable API Key from backend
- [ ] Implement product fetching
- [ ] Implement cart functionality
- [ ] Implement authentication
- [ ] Implement checkout flow
- [ ] Implement order history
- [ ] Test all API endpoints
- [ ] Handle error states
- [ ] Add loading states
- [ ] Implement customer profile management

### Testing Integration

```bash
# 1. Ensure backend is running
curl http://localhost:9000/health

# 2. Test product endpoint
curl http://localhost:9000/store/products

# 3. Test authentication
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## Common Issues & Solutions

### Issue 1: CORS Errors
**Solution**: Ensure `STORE_CORS` in server `.env` includes storepage URL

### Issue 2: Authentication Fails
**Solution**: Check JWT_SECRET and COOKIE_SECRET are set in server

### Issue 3: Products Not Loading
**Solution**: Verify Publishable API Key and backend URL

### Issue 4: Cart Not Persisting
**Solution**: Check localStorage is working and cart ID is stored correctly

---

## Additional Resources

- [Medusa.js Documentation](https://docs.medusajs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Medusa JS SDK](https://docs.medusajs.com/resources/js-sdk)
- [Project Guidelines](./GUIDELINES.md)
- [Main README](./README.md)

---

## Support & Contact

For questions or issues with this monorepo:
- **Email**: support@lb-frozen.com
- **Repository**: https://github.com/newgenwebdev/lb-frozen
- **Documentation**: See README.md and GUIDELINES.md

---

**End of Documentation**
