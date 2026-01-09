# LB Frozen Development Guidelines

This document provides development standards and architecture overview for the LB Frozen e-commerce platform.

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Project Boundaries](#project-boundaries)
- [API Integration](#api-integration)
- [Testing](#testing)
- [Git Workflow](#git-workflow)
- [Troubleshooting](#troubleshooting)

---

## Project Overview

LB Frozen is a monorepo containing three independent projects that together form a complete e-commerce platform.

| Project | Purpose | Stack |
|---------|---------|-------|
| `server/` | Backend API | Medusa.js 2.0, Node.js 22.x, TypeScript, PostgreSQL |
| `storepage/` | Customer storefront | Next.js 16, React 19, Tailwind CSS |
| `admin/` | Admin panel | Next.js 16, React 19, Zustand, React Query |

### Key Features

- **Membership System**: Customer loyalty tiers with benefits
- **Points System**: Reward points for purchases
- **File Storage**: MinIO-based image/file management
- **Multi-currency**: Support for multiple currencies and regions

---

## Architecture

### System Diagram

```
┌─────────────────┐     ┌─────────────────┐
│   Customer      │     │     Admin       │
│   Storefront    │     │     Panel       │
│  (Port 3000)    │     │  (Port 3001)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │  Medusa SDK           │  Axios + JWT
         │  /store/* endpoints   │  /admin/* endpoints
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │   Backend   │
              │   Server    │
              │ (Port 9000) │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
    │PostgreSQL│ │  Redis  │ │  MinIO  │
    └─────────┘ └─────────┘ └─────────┘
```

### Project Responsibilities

**`server/`** - Backend API Only
- RESTful API endpoints (`/store/*`, `/admin/*`)
- Database models and migrations
- Business logic (workflows, services, modules)
- API documentation (Swagger at `/docs`)
- No custom UI (only built-in Medusa admin if enabled)

**`storepage/`** - Customer Experience Only
- Product browsing and search
- Shopping cart and checkout
- Customer account management
- Order history and tracking

**`admin/`** - Staff Management Only
- Product and inventory management
- Order processing and fulfillment
- Customer management
- Analytics and reporting

---

## Development Setup

### Prerequisites

- Node.js 22.x
- PostgreSQL 15+
- Redis (optional, for caching)
- MinIO (optional, for file storage)

### Default Ports

| Service | Port | URL |
|---------|------|-----|
| Backend Server | 9000 | http://localhost:9000 |
| Customer Frontend | 3000 | http://localhost:3000 |
| Admin Dashboard | 3001 | http://localhost:3001 |
| API Documentation | 9000 | http://localhost:9000/docs |

### Starting Development Servers

**Option 1: Run individually**

```bash
# Terminal 1 - Backend
cd server && pnpm dev

# Terminal 2 - Storepage
cd storepage && pnpm dev

# Terminal 3 - Admin (port 3001)
cd admin && pnpm dev
```

**Option 2: From root directory**

```bash
pnpm dev:server
pnpm dev:storepage
pnpm dev:admin
```

### Environment Variables

Each project has its own `.env` file. Never commit these files.

**Server (`server/.env`)**
```env
DATABASE_URL=postgres://...
REDIS_URL=redis://...
JWT_SECRET=...
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:3001
```

**Storepage (`storepage/.env`)**
```env
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY=pk_...
```

**Admin (`admin/.env`)**
```env
NEXT_PUBLIC_API_URL=http://localhost:9000
```

---

## Coding Standards

### TypeScript

All projects use TypeScript with strict mode enabled.

```typescript
// Good - explicit types, no any
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Bad - implicit any, no return type
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

**Rules:**
- No `any` types - use `unknown` with type guards instead
- Explicit return types on all functions
- Use descriptive variable names
- Prefer interfaces over type aliases for objects

### File Organization

**Server:**
```
server/src/
├── api/           # Route handlers
│   ├── admin/     # Admin API routes
│   └── store/     # Store API routes
├── modules/       # Business logic modules
├── workflows/     # Multi-step operations
├── services/      # Shared services
└── migrations/    # Database migrations
```

**Frontend/Admin:**
```
app/
├── (routes)/      # Page routes
├── components/    # React components
├── hooks/         # Custom hooks
├── lib/           # Utilities and API clients
└── types/         # TypeScript definitions
```

### Component Guidelines

```tsx
// Good - typed props, clear structure
interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps): JSX.Element {
  return (
    <div className="p-4 border rounded">
      <h3>{product.title}</h3>
      <button onClick={() => onAddToCart(product.id)}>Add to Cart</button>
    </div>
  );
}
```

---

## Project Boundaries

### Where Code Belongs

| Feature | Location | Never In |
|---------|----------|----------|
| Admin UI components | `admin/` | `server/`, `storepage/` |
| Customer UI components | `storepage/` | `admin/`, `server/` |
| API endpoints | `server/src/api/` | Frontend projects |
| Business logic | `server/src/modules/` | Frontend projects |
| Database models | `server/` | Frontend projects |

### Cross-Project Feature Development

When implementing features that span multiple projects:

**Priority Order:**
1. **First**: Adapt the target project to use existing APIs
2. **Second**: Check if required functionality already exists
3. **Last**: Modify other projects only if necessary

**Example - Adding Login to Frontend:**
```
1. Check: Does /store/auth endpoint exist? → Yes
2. Action: Build frontend login page to call existing endpoint
3. Result: No server changes needed
```

**Example - Adding New Feature:**
```
1. Check: Does /store/membership/status endpoint exist? → No
2. Action: Add endpoint to server first
3. Then: Build frontend UI to consume new endpoint
```

---

## API Integration

### Frontend → Server (Customer)

Uses Medusa JS SDK with publishable API key.

```typescript
import Medusa from "@medusajs/js-sdk";

const medusa = new Medusa({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY,
});

// Example: Fetch products
const { products } = await medusa.store.product.list();
```

### Admin → Server

Uses Axios with JWT Bearer token.

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Example: Fetch orders
const { data } = await api.get("/admin/orders");
```

### Authentication

**Customer (Frontend):**
- Uses Medusa's `/store/auth` endpoints
- Session-based or JWT via Medusa SDK
- Cart tied to customer session

**Admin (Dashboard):**
- Uses `/admin/auth` endpoints
- JWT stored in localStorage
- Axios interceptor attaches token automatically

---

## Testing

### Running Tests

```bash
# Server
cd server && pnpm test

# Storepage
cd storepage && pnpm test

# Admin
cd admin && pnpm test
```

### Integration Testing Checklist

1. Start all three projects on correct ports
2. Test customer flow: Browse → Add to Cart → Checkout
3. Test admin flow: Login → Manage Products → Process Orders
4. Verify data consistency: Admin changes reflect in frontend
5. Test error scenarios: Invalid auth, network failures

### Common Test Scenarios

- [ ] Customer can browse products without auth
- [ ] Customer can register and login
- [ ] Customer can complete checkout
- [ ] Admin can login with valid credentials
- [ ] Admin can create/update products
- [ ] Admin can view and update orders

---

## Git Workflow

### Branch Naming

```
feature/add-membership-purchase
fix/cart-total-calculation
refactor/auth-flow
```

### Commit Messages

Use conventional commits format:

```
feat(storepage): add membership purchase flow
fix(server): correct price calculation for discounts
refactor(admin): simplify order management hooks
docs: update API integration guide
```

**Good commit:**
```
feat(storepage): add membership purchase flow

- Create membership purchase page with Stripe integration
- Add membership status display to user profile
- Update cart to show member discounts
```

**Bad commit:**
```
update styles and stuff
```

### Pull Request Guidelines

1. One feature/fix per PR
2. Include description of changes
3. Reference related issues
4. Ensure all tests pass
5. Request review from team member

---

## Troubleshooting

### Common Issues

**CORS Errors**
```
Check server .env:
STORE_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:3001
```

**Authentication Failures**
- Verify JWT secret matches across services
- Check token expiration
- Ensure correct API key for store requests

**Port Conflicts**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

**API URL Mismatches**
- Verify `NEXT_PUBLIC_*` variables in frontend `.env`
- Ensure server is running on expected port
- Check for trailing slashes in URLs

**MedusaService Methods Not Working**
```
Error: service.list is not a function
Error: service.listAndCount is not a function
Error: Trying to query by not existing property Model.filters
```
- **Cause**: Service class name conflicts with Medusa's auto-generated internal service
- **Solution**: Rename service class from `{ModelName}Service` to `{ModelName}ModuleService`
  - `MembershipService` → `MembershipModuleService`
  - `PointsService` → `PointsModuleService`
- **Also check**: Method signature should be `(filters, config)` not `({ filters: {...} })`

### Debug Steps

1. **Identify the layer**: UI, API, or Database?
2. **Isolate the project**: Test each independently
3. **Check integration points**: API URLs, auth tokens, data formats
4. **Review logs**: Server logs, browser console, network tab

### Useful Commands

```bash
# Server logs
tail -f server/.medusa/server/logs/*.log

# Check database connection
cd server && pnpm db:check

# Reset database
cd server && pnpm db:reset

# Seed sample data
cd server && pnpm seed
```

---

## Reference Links

- [Medusa Documentation](https://docs.medusajs.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [React Query Documentation](https://tanstack.com/query/latest)

---

## Quick Reference

| Item | Value |
|------|-------|
| Server Port | 9000 |
| Storepage Port | 3000 |
| Admin Port | 3001 |
| Package Manager | pnpm (all projects) |

---

*Last Updated: 2025-12-30*
