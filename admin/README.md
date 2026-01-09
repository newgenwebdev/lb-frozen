# LB Frozen Admin

Admin dashboard for managing the LB Frozen e-commerce platform.

## Tech Stack

- **Framework**: Next.js 16.0.10
- **React**: 19.2.3
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand 5.0.8
- **Server State**: React Query (TanStack Query) 5.90.10
- **Forms**: React Hook Form 7.66.1
- **Validation**: Zod 4.1.12
- **HTTP Client**: Axios 1.13.2
- **Charts**: Recharts 3.4.1
- **Date Picker**: react-datepicker 9.0.0

## Prerequisites

- Node.js 20.x or higher
- pnpm (recommended) or bun/npm
- Running [lb-frozen-server](../server) on port 9000

## Installation

```bash
# Install dependencies (using pnpm - recommended)
pnpm install

# Or using other package managers
bun install
npm install
```

## Environment Variables

Create a `.env.local` file:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:9000
```

## Development

```bash
# Start development server on port 3001
pnpm dev

# Alternative package managers
bun dev
npm run dev
```

The admin panel runs on **port 3001** by default.

Open http://localhost:3001 in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (port 3001) |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Project Structure

```
app/
├── (auth)/                  # Authentication routes
│   └── login/               # Admin login page
├── admin/                   # Protected admin routes
│   ├── layout.tsx           # Admin layout with sidebar
│   ├── page.tsx             # Dashboard redirect
│   ├── overview/            # Dashboard overview
│   ├── products/            # Product management
│   │   ├── page.tsx         # Product listing
│   │   ├── add-product/     # Add new product
│   │   └── edit/[id]/       # Edit product
│   ├── categories/          # Category management
│   ├── orders/              # Order management
│   │   ├── page.tsx         # Order listing
│   │   └── [id]/            # Order details
│   ├── returns/             # Return request management
│   ├── membership/          # Membership management
│   │   ├── page.tsx         # Members list
│   │   ├── members/         # Member details
│   │   ├── tiers/           # Membership tiers
│   │   ├── promos/          # Member promotions
│   │   ├── points/          # Points management
│   │   └── settings/        # Membership settings
│   ├── promos/              # Promotion management
│   │   ├── page.tsx         # Promo listing
│   │   └── add/             # Add new promo
│   ├── article/             # Blog article management
│   ├── banner/              # Homepage banner management
│   ├── shipment/            # Shipping options
│   ├── users-roles/         # User and role management
│   ├── notifications/       # Notification center
│   └── settings/            # System settings
├── layout.tsx               # Root layout
├── page.tsx                 # Entry redirect
└── globals.css              # Global styles

components/
├── ui/                      # Reusable UI components
├── admin/                   # Admin-specific components
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── OrderCard.tsx
│   ├── OrderDetailsDrawer.tsx
│   └── RecentOrdersTable.tsx
└── forms/                   # Form components

contexts/
└── ToastContext.tsx         # Toast notification system

hooks/                       # Custom React hooks

lib/
├── api/                     # API client and queries
│   ├── client.ts            # Axios instance
│   └── queries.ts           # React Query hooks
├── validators/              # Zod schemas
├── utils/                   # Utility functions
└── types/                   # TypeScript definitions
```

## Features

### Dashboard Overview
- Revenue analytics with charts
- Order statistics
- Recent orders table
- Low stock alerts
- Top-selling products

### Product Management
- Create, edit, delete products
- Manage variants and pricing
- Inventory tracking
- Product images upload

### Order Management
- View all orders with filtering
- Order detail view
- Update fulfillment status
- Process refunds
- Ship orders
- Cancel orders

### Return Management
- View return requests
- Approve/reject returns
- Track return status
- Process refunds

### Membership System
- View and manage members
- Configure membership tiers
- Set up member promotions
- Adjust points balance
- View points history
- Configure points earning rates

### Promotions
- Create coupon codes
- Set up PWP (Purchase With Purchase) deals
- Configure discount rules
- Set validity periods

### Content Management
- Blog article editor
- Homepage banner management
- Category management
- Ingredient database

### User Management
- Admin user management
- Role assignments
- Password management

## API Integration

The admin uses Axios with JWT authentication:

```typescript
import { api } from "@/lib/api/client"

// The client automatically attaches JWT token
const { data } = await api.get("/admin/orders")

// Create product
await api.post("/admin/products", productData)
```

### React Query for Data Fetching

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// Fetch orders
const { data, isLoading } = useQuery({
  queryKey: ["orders"],
  queryFn: () => api.get("/admin/orders").then(res => res.data),
})

// Create mutation
const queryClient = useQueryClient()
const mutation = useMutation({
  mutationFn: (data) => api.post("/admin/products", data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["products"] })
  },
})
```

### Zod Validation

```typescript
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

const ProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().positive("Price must be positive"),
})

type ProductForm = z.infer<typeof ProductSchema>

const form = useForm<ProductForm>({
  resolver: zodResolver(ProductSchema),
})
```

## Toast Notifications

Use the Toast context for notifications:

```typescript
import { useToast } from "@/contexts/ToastContext"

function MyComponent() {
  const { showToast, confirm } = useToast()

  // Show notification
  showToast("Product created successfully!", "success")
  showToast("Failed to save", "error")

  // Confirmation dialog
  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete Product",
      message: "Are you sure? This cannot be undone.",
      confirmText: "Delete",
      type: "danger",
    })

    if (confirmed) {
      // Proceed with deletion
    }
  }
}
```

## Styling Guidelines

Use Tailwind CSS exclusively (same as frontend):

```tsx
// Correct
<button className="cursor-pointer rounded bg-black px-4 py-2 text-white">
  Save
</button>

// Incorrect - Never use inline styles
<button style={{ backgroundColor: 'black' }}>Save</button>
```

### Portal-Based Menus

For dropdown menus in tables, use `createPortal` to prevent clipping:

```typescript
import { createPortal } from 'react-dom'

{menuOpen && createPortal(
  <div className="fixed z-[9999] rounded-lg bg-white shadow-lg">
    {/* Menu items */}
  </div>,
  document.body
)}
```

## Authentication

Admin authentication uses JWT stored in localStorage:

1. Login at `/login`
2. JWT token stored in localStorage
3. Axios interceptor attaches token to all requests
4. Protected routes redirect to login if not authenticated

## Production Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## Deployment

### Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3001
CMD ["pnpm", "start"]
```

## Troubleshooting

### API Connection Issues
- Ensure backend is running on port 9000
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings (`ADMIN_CORS`) in backend

### Authentication Issues
- Clear localStorage and re-login
- Check JWT token expiration
- Verify admin user exists in database

### Port Conflicts
The admin must run on port 3001 (configured in package.json):

```bash
# If port 3001 is in use
lsof -i :3001
kill -9 <PID>
```

### Table Action Menu Clipping
If dropdown menus are cut off by table overflow:
- Use `createPortal` to render menu in document.body
- Set `z-index: 9999` on the menu

## Package Manager Priority

1. **pnpm** (recommended) - Fast, efficient disk space
2. bun
3. yarn
4. npm

## Related Projects

- [lb-frozen-server](../server) - Backend API (port 9000)
- [lb-frozen-storepage](../storepage) - Customer storefront (port 3000)

## License

MIT
